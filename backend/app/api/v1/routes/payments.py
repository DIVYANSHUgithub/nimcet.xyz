
import json
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from pydantic import AwareDatetime, BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import get_current_principal, get_optional_principal, require_roles
from app.db.database import DatabaseUnavailable
from app.db.payments import CheckoutRepriceRequired, PaymentError
from app.services.pass_payments import full_refund, reconcile_order, sync_order_payments
from app.services.razorpay import GatewayUnavailable, gateway_id, signed

router = APIRouter()
admin = Depends(require_roles("administrator", "super_administrator"))
student = Depends(get_current_principal)


def fail(status, code, message):
    raise HTTPException(status, detail={"code": code, "message": message})


def configured(request: Request):
    settings = request.app.state.settings
    if not settings.payments_enabled:
        fail(404, "payments_disabled", "Student Pass checkout is not available.")
    if not settings.payments_configured:
        fail(503, "payments_unavailable", "Student Pass payments are temporarily unavailable.")
    return request.app.state.payment_repository, request.app.state.razorpay


def admin_repository(request: Request):
    settings = request.app.state.settings
    if not settings.payments_enabled:
        fail(404, "payments_disabled", "Student Pass is disabled. Set PAYMENTS_ENABLED=true on the backend.")
    if not settings.payment_admin_configured:
        fail(503, "payment_admin_not_configured",
             "Student Pass administration requires TEST_ENGINE_ENABLED, TRUSTED_ROLE_LOOKUP_ENABLED and ADMIN_WORKFLOWS_ENABLED.")
    return request.app.state.payment_repository


def admin_gateway(request: Request):
    repository = admin_repository(request)
    if not request.app.state.settings.payments_configured:
        fail(503, "payment_gateway_not_configured",
             "Razorpay actions require RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and a separate RAZORPAY_WEBHOOK_SECRET.")
    return repository, request.app.state.razorpay


def execute(operation):
    try:
        return operation()
    except PaymentError as error:
        fail(error.status, error.code, error.message)
    except (DatabaseUnavailable, GatewayUnavailable):
        fail(503, "payments_unavailable", "Payments are temporarily unavailable. Check your order before trying again.")


class Checkout(BaseModel):
    amount: int = Field(ge=100, le=29900, strict=True)


class Verification(BaseModel):
    order_id: UUID
    razorpay_order_id: str = Field(pattern=r"^order_[a-zA-Z0-9]{1,64}$")
    razorpay_payment_id: str = Field(pattern=r"^pay_[a-zA-Z0-9]{1,64}$")
    razorpay_signature: str = Field(pattern=r"^[0-9a-f]{64}$")


class Offer(BaseModel):
    label: str = Field(min_length=1, max_length=80)
    amount: int = Field(ge=100, lt=29900, strict=True)
    starts_at: AwareDatetime
    ends_at: AwareDatetime


class Refund(BaseModel):
    reason: str = Field(min_length=4, max_length=500, pattern=r"\S")


class TestAccess(BaseModel):
    pass_required: bool


@router.get("/payments/pass")
def summary(request: Request, response: Response, principal=Depends(get_optional_principal)):
    response.headers["Cache-Control"] = "private, no-store"
    if not request.app.state.settings.payments_enabled:
        return {"enabled": False}
    repository, _ = configured(request)
    return execute(lambda: pass_summary(request, repository, principal))


def pass_summary(request, repository, principal):
    result = repository.summary(principal.user_id if principal else None)
    if not request.app.state.settings.payments_checkout_enabled:
        result["checkout_open"] = False
        result["sales_paused"] = True
    return result


@router.post("/payments/orders")
def create_order(payload: Checkout, request: Request, principal=student):
    repository, gateway = configured(request)
    if not request.app.state.settings.payments_checkout_enabled:
        fail(503, "checkout_paused", "Student Pass checkout is temporarily paused.")

    def operation():
        try:
            order = repository.reserve_order(principal.user_id, payload.amount)
        except CheckoutRepriceRequired as change:
            previous = change.order
            if sync_order_payments(repository, gateway, previous):
                raise PaymentError("payment_in_progress", "Your previous payment is still being confirmed. Check its status before trying again.") from None
            try:
                order = repository.reserve_order(
                    principal.user_id, payload.amount,
                    checked_previous=(previous["id"], previous["gateway_order_id"]),
                )
            except CheckoutRepriceRequired:
                raise PaymentError("checkout_changed", "Your checkout changed. Reload to see the latest order.") from None
        provider_id = order["gateway_order_id"]
        if not provider_id:
            provider_id = repository.attach_gateway_order(order, gateway.create_order(order))
        return {"order_id": order["id"], "razorpay_order_id": provider_id, "amount": order["amount"],
                "currency": "INR", "key_id": request.app.state.settings.razorpay_key_id}

    return execute(operation)


@router.post("/payments/verify")
def verify(payload: Verification, request: Request, principal=student):
    repository, gateway = configured(request)

    def operation():
        order = repository.order(payload.order_id, principal.user_id)
        stored = order["gateway_order_id"]
        message = f"{stored}|{payload.razorpay_payment_id}".encode()
        secret = request.app.state.settings.razorpay_key_secret.get_secret_value()
        if stored != payload.razorpay_order_id or not signed(secret, message, payload.razorpay_signature):
            raise PaymentError("invalid_checkout_signature", "Checkout could not be verified.", 400)
        payment = gateway.payment(payload.razorpay_payment_id)
        if payment.get("id") != payload.razorpay_payment_id or payment.get("order_id") != stored:
            raise PaymentError("payment_mismatch", "Payment does not match the checkout order.", 422)
        if payment.get("status") in {"captured", "refunded"}:
            refund = full_refund(gateway, payment) if payment.get("amount_refunded") or payment["status"] == "refunded" else None
            repository.record_capture(payment, refund=refund)
        return pass_summary(request, repository, principal)

    return execute(operation)


@router.post("/payments/orders/{order_id}/reconcile")
def refresh_order(order_id: UUID, request: Request, principal=student):
    repository, gateway = configured(request)

    def operation():
        reconcile_order(repository, gateway, repository.order(order_id, principal.user_id))
        return pass_summary(request, repository, principal)

    return execute(operation)


@router.post("/payments/webhooks/razorpay")
async def webhook(
    request: Request,
    x_razorpay_signature: str = Header(default="", max_length=128),
    x_razorpay_event_id: str = Header(default="", max_length=128),
):
    repository, gateway = configured(request)
    raw = bytearray()
    async for chunk in request.stream():
        raw.extend(chunk)
        if len(raw) > 128 * 1024:
            fail(413, "webhook_too_large", "Webhook body is too large.")
    secret = request.app.state.settings.razorpay_webhook_secret.get_secret_value()
    if not x_razorpay_event_id or not signed(secret, raw, x_razorpay_signature):
        fail(400, "invalid_webhook_signature", "Webhook could not be verified.")
    try:
        event = json.loads(raw)
        event_type = event["event"]
        if event_type == "payment.captured":
            payment = event["payload"]["payment"]["entity"]
            if not isinstance(payment, dict):
                raise ValueError
            confirmed_at = datetime.fromtimestamp(event["created_at"], timezone.utc)
            def process():
                repository.record_capture(payment, event_id=x_razorpay_event_id, confirmed_at=confirmed_at)
        elif event_type in {"refund.created", "refund.processed", "refund.failed"}:
            refund = event["payload"]["refund"]["entity"]
            if not isinstance(refund, dict) or not gateway_id(refund.get("payment_id"), "pay"):
                raise ValueError
            def process():
                try:
                    repository.record_refund(refund, event_id=x_razorpay_event_id)
                except PaymentError as error:
                    if error.code != "missing_capture":
                        raise
                    payment = gateway.payment(refund["payment_id"])
                    repository.record_capture(payment, refund=refund, event_id=x_razorpay_event_id)
        else:
            return {"accepted": True}
    except (ValueError, TypeError, KeyError, OverflowError, OSError):
        fail(400, "invalid_webhook", "Webhook payload was invalid.")
    await run_in_threadpool(execute, process)
    return {"accepted": True}


@router.get("/admin/payments")
def queue(request: Request, response: Response, page: int = Query(1, ge=1, le=10000),
          queue: Literal["refund", "checkout", "all"] = "all", principal=admin):
    response.headers["Cache-Control"] = "private, no-store"
    repository = admin_repository(request)
    return {
        **execute(lambda: repository.admin_queue(page, queue)),
        "gateway_actions_available": request.app.state.settings.payments_configured,
    }


@router.post("/admin/payments/orders/{order_id}/reconcile")
def admin_reconcile(order_id: UUID, request: Request, principal=admin):
    repository, gateway = admin_gateway(request)
    return execute(lambda: (reconcile_order(repository, gateway, repository.order(order_id)) or {"reconciled": True}))


@router.post("/admin/payments/{payment_id}/refund")
def refund_payment(payment_id: str, payload: Refund, request: Request, principal=admin):
    repository, gateway = admin_gateway(request)
    if not gateway_id(payment_id, "pay") or len(payload.reason.strip()) < 4:
        fail(422, "invalid_refund_request", "Select a captured payment and enter a reason.")

    def operation():
        payment, amount, should_request = repository.request_refund(
            payment_id, principal.user_id, request.state.request_id, payload.reason.strip()
        )
        if should_request:
            try:
                result = gateway.create_refund(payment, amount)
            except GatewayUnavailable:
                matching = [row for row in gateway.refunds(payment_id)
                            if row.get("receipt") == str(payment["refund_operation_id"])]
                if len(matching) != 1:
                    raise
                result = matching[0]
            if result.get("payment_id") != payment_id:
                raise PaymentError("refund_mismatch", "Refund needs reconciliation.", 502)
            repository.record_refund(result)
            return {"status": result["status"]}
        return {"status": payment["refund_status"]}

    return execute(operation)


@router.put("/admin/payments/offer")
def update_offer(payload: Offer, request: Request, principal=admin):
    repository = admin_repository(request)
    if not payload.label.strip():
        fail(422, "invalid_offer", "Enter an offer name.")
    return execute(lambda: repository.set_offer(
        principal.user_id, request.state.request_id, label=payload.label.strip(),
        amount=payload.amount, starts_at=payload.starts_at, ends_at=payload.ends_at
    ))


@router.delete("/admin/payments/offer")
def clear_offer(request: Request, principal=admin):
    repository = admin_repository(request)
    return execute(lambda: repository.set_offer(principal.user_id, request.state.request_id))


@router.patch("/admin/payments/tests/{test_id}")
def set_test_access(test_id: UUID, payload: TestAccess, request: Request, principal=admin):
    repository = admin_repository(request)
    return execute(lambda: repository.set_test_access(
        test_id, payload.pass_required, principal.user_id, request.state.request_id
    ))
