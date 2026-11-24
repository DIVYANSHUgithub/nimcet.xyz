
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
import json
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from app.api import dependencies
from app.core.config import Settings
from app.core.security import Principal, VerifiedIdentity
from app.db.pass_devices import DeviceConflict
from app.db.payments import CheckoutRepriceRequired, PaymentError, _state
from app.main import create_app

BUYER = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
ORDER = uuid4()
PAYMENT = {"id": "pay_sample", "order_id": "order_sample", "amount": 29900,
           "currency": "INR", "status": "captured", "created_at": 1795200000}
KEY_SECRET = "test-api-secret"
WEBHOOK_SECRET = "test-webhook-secret"


def sign(secret, body):
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


class Verifier:
    configured = True

    def verify(self, token):
        return VerifiedIdentity(
            subject=OTHER if token == "other" else BUYER, issuer="test", audience="authenticated",
            session_id=UUID("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"),
        )

    def roles_for(self, _identity):
        return frozenset({"student"})


class Repository:
    def __init__(self):
        self.captures = []
        self.fail_capture = False

    def order(self, order_id, user_id):
        if order_id != ORDER or user_id != BUYER:
            raise PaymentError("order_not_found", "Order was not found.", 404)
        return {"id": ORDER, "gateway_order_id": "order_sample"}

    def record_capture(self, payment, **kwargs):
        if self.fail_capture:
            raise PaymentError("payment_mismatch", "Payment does not match the checkout order.", 422)
        self.captures.append((payment, kwargs))

    def summary(self, _user):
        return {"orders": [{"status": "active"}] if self.captures else []}


class Gateway:
    def __init__(self):
        self.payment_status = "captured"
        self.lookups = []

    def payment(self, identifier):
        self.lookups.append(identifier)
        return {**PAYMENT, "status": self.payment_status}


def build(monkeypatch):
    monkeypatch.setattr(dependencies, "claim_device", lambda *args, **kwargs: None)
    identity = Verifier()
    app = create_app(Settings(
        _env_file=None, environment="development", payments_enabled=True, test_engine_enabled=True,
        admin_workflows_enabled=True, trusted_role_lookup_enabled=True, razorpay_key_id="rzp_test_demo",
        razorpay_key_secret=KEY_SECRET, razorpay_webhook_secret=WEBHOOK_SECRET,
    ), token_verifier=identity, role_resolver=identity)
    repository, gateway = Repository(), Gateway()
    app.state.payment_repository, app.state.razorpay = repository, gateway
    return TestClient(app), repository, gateway


def verify_body():
    return {"order_id": str(ORDER), "razorpay_order_id": "order_sample",
            "razorpay_payment_id": "pay_sample",
            "razorpay_signature": sign(KEY_SECRET, b"order_sample|pay_sample")}


def test_checkout_requires_order_ownership_and_valid_signature(monkeypatch):
    client, repository, gateway = build(monkeypatch)
    path = "/api/v1/payments/verify"
    body = verify_body()
    assert client.post(path, json=body, headers={"Authorization": "Bearer other"}).status_code == 404
    assert client.post(path, json={**body, "razorpay_order_id": "order_forged"},
                       headers={"Authorization": "Bearer buyer"}).status_code == 400
    assert not gateway.lookups
    assert not repository.captures


def test_checkout_reprices_unpaid_order_after_checking_razorpay(monkeypatch):
    client, repository, gateway = build(monkeypatch)
    previous = {"id": ORDER, "gateway_order_id": "order_sample", "amount": 29900}
    new = {"id": uuid4(), "gateway_order_id": None, "amount": 9900}
    checks = []

    def reserve(user, amount, *, checked_previous=None):
        assert (user, amount) == (BUYER, 9900)
        if checked_previous is None:
            raise CheckoutRepriceRequired(previous)
        assert checks == ["order_sample"]
        assert checked_previous == (ORDER, "order_sample")
        return new

    def existing_payments(order_id):
        checks.append(order_id)
        return [{**PAYMENT, "status": "failed"}]

    monkeypatch.setattr(repository, "reserve_order", reserve, raising=False)
    monkeypatch.setattr(gateway, "payments", existing_payments, raising=False)
    monkeypatch.setattr(gateway, "create_order", lambda order: {"amount": order["amount"]}, raising=False)
    monkeypatch.setattr(repository, "attach_gateway_order", lambda order, provider: "order_offer", raising=False)
    response = client.post("/api/v1/payments/orders", json={"amount": 9900}, headers={"Authorization": "Bearer buyer"})
    assert response.status_code == 200
    assert response.json()["amount"] == 9900
    assert response.json()["razorpay_order_id"] == "order_offer"
    assert response.json()["order_id"] == str(new["id"])


def test_checkout_does_not_replace_an_authorized_payment(monkeypatch):
    client, repository, gateway = build(monkeypatch)
    previous = {"id": ORDER, "gateway_order_id": "order_sample", "amount": 29900}

    def reserve(user, amount, *, checked_previous=None):
        assert checked_previous is None, "An unsettled payment must block replacement"
        raise CheckoutRepriceRequired(previous)

    monkeypatch.setattr(repository, "reserve_order", reserve, raising=False)
    monkeypatch.setattr(gateway, "payments", lambda order_id: [{**PAYMENT, "status": "authorized"}], raising=False)
    response = client.post("/api/v1/payments/orders", json={"amount": 9900}, headers={"Authorization": "Bearer buyer"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "payment_in_progress"


def test_checkout_requires_capture_and_students_cannot_refund(monkeypatch):
    client, repository, gateway = build(monkeypatch)
    auth = {"Authorization": "Bearer buyer"}
    gateway.payment_status = "authorized"
    result = client.post("/api/v1/payments/verify", json=verify_body(), headers=auth)
    assert result.json()["orders"] == []
    gateway.payment_status = "captured"
    result = client.post("/api/v1/payments/verify", json=verify_body(), headers=auth)
    assert result.json()["orders"] == [{"status": "active"}]
    assert len(repository.captures) == 1
    refund = client.post("/api/v1/admin/payments/pay_sample/refund",
                         json={"reason": "Support exception"}, headers=auth)
    assert refund.status_code == 403


def test_admin_can_review_captured_orders_without_local_gateway_credentials(monkeypatch):
    client, repository, gateway = build(monkeypatch)
    client.app.state.settings.razorpay_key_secret = None

    async def admin_principal():
        return Principal(OTHER, frozenset({"super_administrator"}))

    client.app.dependency_overrides[dependencies.get_authenticated_principal] = admin_principal
    queue = [{"id": str(ORDER), "status": "active"}]
    monkeypatch.setattr(repository, "admin_queue", lambda page, kind: {"items": queue}, raising=False)

    assert client.get("/api/v1/admin/payments").json()["items"] == queue
    assert client.post(f"/api/v1/admin/payments/orders/{ORDER}/approve").status_code == 404
    blocked = client.post(f"/api/v1/admin/payments/orders/{ORDER}/reconcile")
    assert blocked.status_code == 503
    assert blocked.json()["error"]["code"] == "payment_gateway_not_configured"
    assert client.get("/api/v1/payments/pass").status_code == 503
    assert not gateway.lookups


def test_webhook_checks_raw_signature_and_preserves_gateway_event_id(monkeypatch):
    client, repository, _ = build(monkeypatch)
    body = json.dumps({"event": "payment.captured", "created_at": 1795200007,
                       "payload": {"payment": {"entity": PAYMENT}}}).encode()
    path = "/api/v1/payments/webhooks/razorpay"
    headers = {"X-Razorpay-Event-Id": "evt_test", "X-Razorpay-Signature": sign(WEBHOOK_SECRET, body)}
    assert client.post(path, content=body + b" ", headers=headers).status_code == 400
    assert not repository.captures
    repository.fail_capture = True
    assert client.post(path, content=body, headers=headers).status_code == 422
    repository.fail_capture = False
    assert client.post(path, content=body, headers=headers).status_code == 200
    assert repository.captures[0][1]["event_id"] == "evt_test"
    assert repository.captures[0][1]["confirmed_at"] == datetime.fromtimestamp(1795200007, UTC)


def test_explicit_same_type_device_takeover(monkeypatch):
    client, _, _ = build(monkeypatch)
    attempts = []

    def claim(_db, _user, session_id, kind, *, replace):
        attempts.append((session_id, kind, replace))
        if not replace:
            raise DeviceConflict

    monkeypatch.setattr(dependencies, "claim_device", claim)
    auth = {"Authorization": "Bearer buyer", "User-Agent": "Mozilla/5.0 (iPhone)"}
    response = client.get("/api/v1/payments/pass", headers=auth)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "device_slot_conflict"
    assert client.post("/api/v1/auth/device", headers=auth, json={"replace": True}).status_code == 200
    assert attempts[0][0] == attempts[1][0]
    assert [attempt[1:] for attempt in attempts] == [("mobile", False), ("mobile", True)]


def test_captured_order_status_respects_cutoff_expiry_and_refunds():
    now = datetime(2027, 1, 1, tzinfo=UTC)
    row = {"confirmed_at": now, "ends_at": now + timedelta(days=7)}
    assert _state(row, now) == "active"
    assert _state(row, row["ends_at"]) == "expired"
    assert _state({**row, "confirmed_at": row["ends_at"]}, row["ends_at"]) == "refund_review"
    assert _state({**row, "received_after_cutoff": True}, now) == "refund_review"
    assert _state({**row, "is_primary": False}, now) == "duplicate_payment"
    assert _state({"closed_at": now}, now) == "checkout_replaced"
    assert _state({**row, "closed_at": now}, now) == "refund_review"
    assert _state({**row, "refund_status": "requested"}, now) == "refund_pending"
