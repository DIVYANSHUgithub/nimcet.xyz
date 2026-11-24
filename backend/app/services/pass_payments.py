
from app.db.payments import PaymentError


def full_refund(gateway, payment):
    """Use the most recent full refund. Partial refunds are never issued by this app."""
    refunds = gateway.refunds(payment["id"])
    full = [refund for refund in refunds if refund.get("amount") == payment["amount"]]
    if not full:
        return None
    return max(full, key=lambda row: (row.get("status") == "processed", row.get("created_at", 0)))


def reconcile_order(repository, gateway, order):
    if not order["gateway_order_id"] or not repository.claim_reconciliation(order["id"]):
        return
    sync_order_payments(repository, gateway, order, repository.pending_refund_ids(order["id"]))


def sync_order_payments(repository, gateway, order, pending_refunds=()):
    """Record captures and return whether any attempts are still unsettled."""
    unsettled = False
    for payment in gateway.payments(order["gateway_order_id"]):
        if payment.get("order_id") != order["gateway_order_id"]:
            raise PaymentError("payment_mismatch", "Payment does not match the checkout order.", 422)
        if payment.get("status") in {"captured", "refunded"}:
            need_refund = (payment.get("amount_refunded") or payment["status"] == "refunded"
                           or payment["id"] in pending_refunds)
            refund = full_refund(gateway, payment) if need_refund else None
            repository.record_capture(payment, refund=refund)
        elif payment.get("status") != "failed":
            unsettled = True
    return unsettled
