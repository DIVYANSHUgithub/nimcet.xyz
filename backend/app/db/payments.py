
from datetime import datetime, timezone
import json
from uuid import UUID, uuid4

from sqlalchemy import text

from app.db.database import Database, DatabaseUnavailable
from app.services.razorpay import gateway_id

SEASON = "nimcet-2027"


class PaymentError(Exception):
    def __init__(self, code: str, message: str, status: int = 409):
        self.code, self.message, self.status = code, message, status


class CheckoutRepriceRequired(Exception):
    def __init__(self, order):
        self.order = order


def run(connection, sql, **params):
    return connection.execute(text(sql), params)


def _audit(connection, actor, action, entity, request_id, reason=None, **state):
    run(connection, """
        INSERT INTO public.admin_audit_log
            (actor_user_id,action_code,entity_type,entity_id,request_id,reason,after_state)
        VALUES (:actor,:action,'student_pass',:entity,:request,:reason,CAST(:state AS jsonb))
        """, actor=UUID(actor), action=action, entity=str(entity), request=request_id,
        reason=reason, state=json.dumps(state, default=str))


def has_active_pass(connection, user_id):
    return bool(run(connection, """
        SELECT EXISTS (
          SELECT 1 FROM public.pass_orders o
          JOIN public.pass_seasons s ON s.id=o.season_id
          JOIN public.pass_payments p ON p.order_id=o.id AND p.is_primary
          WHERE o.user_id=:user AND o.closed_at IS NULL AND p.refund_status IS NULL
            AND NOT p.received_after_cutoff AND p.confirmed_at < s.ends_at
            AND s.ends_at > clock_timestamp()
        )""", user=user_id).scalar_one())


def _state(row, now):
    refund = row.get("refund_status")
    if refund:
        return {
            "requested": "refund_pending", "pending": "refund_pending",
            "processed": "refunded", "failed": "refund_failed",
        }[refund]
    if not row.get("confirmed_at"):
        if row.get("closed_at"):
            return "checkout_replaced"
        return "awaiting_payment" if now < row["checkout_closes_at"] else "checkout_closed"
    if row.get("is_primary") is False:
        return "duplicate_payment"
    if row.get("closed_at") or row.get("received_after_cutoff") or row["confirmed_at"] >= row["ends_at"]:
        return "refund_review"
    return "active" if now < row["ends_at"] else "expired"


def _view(row, now, *, admin=False):
    keys = ("id", "amount", "standard_amount", "offer_label", "created_at", "confirmed_at", "ends_at")
    if admin:
        keys += ("user_id", "gateway_order_id", "gateway_payment_id", "gateway_refund_id",
                 "refund_reason", "refund_status", "is_primary")
    return {**{key: row.get(key) for key in keys}, "status": _state(row, now), "currency": "INR"}


class PaymentRepository:
    def __init__(self, database: Database):
        self.database = database

    def ready(self):
        try:
            with self.database.read_only_transaction() as connection:
                return bool(run(connection, """
                    SELECT EXISTS (SELECT 1 FROM public.pass_seasons WHERE id=:season)
                      AND has_table_privilege(current_user, 'public.pass_orders', 'INSERT')
                      AND has_table_privilege(current_user, 'public.pass_payments', 'UPDATE')
                      AND has_table_privilege(current_user, 'public.pass_payment_events', 'INSERT')
                      AND has_table_privilege(current_user, 'public.student_device_sessions', 'INSERT')
                      AND has_column_privilege(current_user, 'public.tests', 'pass_required', 'UPDATE')
                """, season=SEASON).scalar_one())
        except DatabaseUnavailable:
            return False

    def _season(self, connection):
        return run(connection, """
            SELECT *, clock_timestamp() AS server_time FROM public.pass_seasons WHERE id=:season
        """, season=SEASON).mappings().one()

    @staticmethod
    def _offer(season):
        starts = season["offer_starts_at"]
        if starts and starts <= season["server_time"] < season["offer_ends_at"]:
            return season["offer_amount"], season["offer_label"]
        return season["standard_amount"], None

    def summary(self, user_id):
        with self.database.read_only_transaction() as connection:
            season = self._season(connection)
            amount, label = self._offer(season)
            now = season["server_time"]
            orders = []
            active = False
            if user_id:
                rows = run(connection, """
                    SELECT o.*,p.confirmed_at,p.refund_status,p.received_after_cutoff,s.ends_at,s.checkout_closes_at
                    FROM public.pass_orders o JOIN public.pass_seasons s ON s.id=o.season_id
                    LEFT JOIN public.pass_payments p ON p.order_id=o.id AND p.is_primary
                    WHERE o.user_id=:user ORDER BY o.created_at DESC LIMIT 20
                """, user=UUID(user_id)).mappings().all()
                orders = [_view(row, now) for row in rows]
                active = has_active_pass(connection, UUID(user_id))
            return {
                "enabled": True, "currency": "INR", "season_id": season["id"],
                "amount": amount, "standard_amount": season["standard_amount"], "offer_label": label,
                "ends_at": season["ends_at"], "checkout_closes_at": season["checkout_closes_at"],
                "checkout_open": now < season["checkout_closes_at"],
                "active": active, "orders": orders,
            }

    def reserve_order(self, user_id, expected_amount, *, checked_previous=None):
        user = UUID(user_id)
        with self.database.transaction() as connection:
            run(connection, "SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))",
                key=f"pass-order:{user}")
            season = self._season(connection)
            if season["server_time"] >= season["checkout_closes_at"]:
                raise PaymentError("checkout_closed", "Student Pass sales have closed for this season.")
            existing = run(connection, """
                SELECT * FROM public.pass_orders
                WHERE user_id=:user AND season_id=:season AND closed_at IS NULL FOR UPDATE
            """, user=user, season=SEASON).mappings().one_or_none()
            # Capture uses the same row lock. Check payments after obtaining it.
            if existing and run(connection, """
                SELECT EXISTS (SELECT 1 FROM public.pass_payments WHERE order_id=:id AND is_primary)
            """, id=existing["id"]).scalar_one():
                raise PaymentError("already_purchased", "A payment for this season is already on file.")
            amount, offer = self._offer(season)
            if amount != expected_amount:
                raise PaymentError("price_changed", "The checkout price changed. Check the updated price and try again.")
            if existing:
                if amount == existing["amount"]:
                    return dict(existing)
                previous = existing["id"], existing["gateway_order_id"]
                if previous[1] and previous != checked_previous:
                    raise CheckoutRepriceRequired(dict(existing))
                run(connection, """
                    UPDATE public.pass_orders SET closed_at=clock_timestamp() WHERE id=:id
                """, id=existing["id"])
            return dict(run(connection, """
                INSERT INTO public.pass_orders (id,season_id,user_id,amount,standard_amount,offer_label)
                VALUES (:id,:season,:user,:amount,:standard,:offer) RETURNING *
            """, id=uuid4(), season=SEASON, user=user, amount=amount,
                standard=season["standard_amount"], offer=offer).mappings().one())

    def attach_gateway_order(self, order, gateway):
        if (not gateway_id(gateway.get("id"), "order") or gateway.get("receipt") != str(order["id"])
                or gateway.get("amount") != order["amount"] or gateway.get("currency") != "INR"):
            raise PaymentError("invalid_gateway_order", "The checkout order could not be verified.", 502)
        with self.database.transaction() as connection:
            result = run(connection, """
                UPDATE public.pass_orders SET gateway_order_id=:gateway WHERE id=:id
                  AND (gateway_order_id IS NULL OR gateway_order_id=:gateway)
                RETURNING gateway_order_id,closed_at
            """, gateway=gateway["id"], id=order["id"]).mappings().one_or_none()
            if result is None:
                raise PaymentError("gateway_order_conflict", "Checkout needs support review.", 502)
        # Keep the old provider ID for reconciliation even if the price changed
        # while this gateway request was in flight.
        if result["closed_at"]:
            raise PaymentError("price_changed", "This checkout was replaced. Reload to see the updated price.")
        return result["gateway_order_id"]

    def order(self, order_id, user_id=None):
        with self.database.read_only_transaction() as connection:
            row = run(connection, """
                SELECT * FROM public.pass_orders WHERE id=:id
                  AND (CAST(:user AS uuid) IS NULL OR user_id=CAST(:user AS uuid))
            """, id=order_id, user=user_id).mappings().one_or_none()
            if row is None:
                raise PaymentError("order_not_found", "Order was not found.", 404)
            return dict(row)

    def pending_orders(self, limit=50):
        with self.database.read_only_transaction() as connection:
            return [dict(row) for row in run(connection, """
                SELECT o.id,o.gateway_order_id FROM public.pass_orders o
                JOIN public.pass_seasons s ON s.id=o.season_id
                LEFT JOIN public.pass_payments p ON p.order_id=o.id AND p.is_primary
                WHERE o.gateway_order_id IS NOT NULL
                  AND ((p.gateway_payment_id IS NULL AND s.ends_at + interval '7 days' > clock_timestamp()) OR EXISTS (
                    SELECT 1 FROM public.pass_payments r WHERE r.order_id=o.id
                      AND r.refund_status IN ('requested','pending')
                  ))
                  AND (o.reconciled_at IS NULL OR o.reconciled_at < clock_timestamp() - interval '5 minutes')
                ORDER BY o.reconciled_at NULLS FIRST,o.created_at LIMIT :limit
            """, limit=limit).mappings()]

    def claim_reconciliation(self, order_id):
        with self.database.transaction() as connection:
            return run(connection, """
                UPDATE public.pass_orders SET reconciled_at=clock_timestamp()
                WHERE id=:id AND (reconciled_at IS NULL OR reconciled_at<clock_timestamp()-interval '15 seconds')
                RETURNING id
            """, id=order_id).scalar_one_or_none() is not None

    def pending_refund_ids(self, order_id):
        with self.database.read_only_transaction() as connection:
            return set(run(connection, """
                SELECT gateway_payment_id FROM public.pass_payments WHERE order_id=:id
                    AND refund_status IN ('requested','pending')
            """, id=order_id).scalars())

    @staticmethod
    def _event(connection, event_id, event_type):
        if event_id is None:
            return True
        return run(connection, """
            INSERT INTO public.pass_payment_events (event_id,event_type)
            VALUES (:id,:type) ON CONFLICT DO NOTHING RETURNING event_id
        """, id=event_id, type=event_type).scalar_one_or_none() is not None

    def record_capture(self, payment, *, confirmed_at=None, event_id=None, refund=None):
        payment_id = payment.get("id")
        provider_order = payment.get("order_id")
        if (not gateway_id(payment_id, "pay") or not gateway_id(provider_order, "order")
                or payment.get("status") not in {"captured", "refunded"}):
            raise PaymentError("invalid_payment", "The captured payment could not be verified.", 422)
        try:
            if type(payment["created_at"]) is not int:
                raise ValueError
            initiated_at = datetime.fromtimestamp(payment["created_at"], timezone.utc)
        except (KeyError, ValueError, OverflowError, OSError):
            raise PaymentError("missing_payment_time", "The gateway payment time needs reconciliation.", 422) from None
        with self.database.transaction() as connection:
            if not self._event(connection, event_id, "payment.captured"):
                return
            order = run(connection, """
                SELECT o.*,s.checkout_closes_at FROM public.pass_orders o
                JOIN public.pass_seasons s ON s.id=o.season_id
                WHERE o.gateway_order_id=:gateway FOR UPDATE OF o
            """, gateway=provider_order).mappings().one_or_none()
            if order is None:
                return
            if payment.get("amount") != order["amount"] or payment.get("currency") != "INR":
                raise PaymentError("payment_mismatch", "Payment does not match the checkout order.", 422)
            if payment["status"] == "refunded" and refund is None:
                raise PaymentError("missing_refund", "The gateway refund still needs to be reconciled.", 503)
            already_primary = run(connection, """
                SELECT 1 FROM public.pass_payments WHERE order_id=:id AND is_primary
            """, id=order["id"]).scalar_one_or_none()
            run(connection, """
                INSERT INTO public.pass_payments (gateway_payment_id,order_id,is_primary,confirmed_at,received_after_cutoff)
                VALUES (:payment,:order,:primary,LEAST(CAST(:confirmed AS timestamptz),clock_timestamp()),:late)
                ON CONFLICT (gateway_payment_id) DO UPDATE
                  SET confirmed_at=LEAST(pass_payments.confirmed_at,excluded.confirmed_at)
                WHERE pass_payments.order_id=excluded.order_id
            """, payment=payment_id, order=order["id"], primary=already_primary is None,
                confirmed=confirmed_at, late=initiated_at >= order["checkout_closes_at"])
            if refund:
                self._apply_refund(connection, order, refund)

    @staticmethod
    def _apply_refund(connection, order, refund):
        refund_id, payment_id, status = refund.get("id"), refund.get("payment_id"), refund.get("status")
        if (not gateway_id(refund_id, "rfnd") or not gateway_id(payment_id, "pay")
                or status not in {"pending", "processed", "failed"} or refund.get("amount") != order["amount"]):
            raise PaymentError("invalid_refund", "Refund details require reconciliation.", 422)
        updated = run(connection, """
            UPDATE public.pass_payments SET gateway_refund_id=:refund,refund_status=:status
            WHERE gateway_payment_id=:payment AND order_id=:order
              AND (refund_status IS DISTINCT FROM 'requested'
                   OR :receipt=CAST(refund_operation_id AS text) OR :status='processed')
              AND (gateway_refund_id IS NULL OR gateway_refund_id=:refund OR refund_status='failed')
              AND refund_status IS DISTINCT FROM 'processed'
              AND (refund_status IS DISTINCT FROM 'failed' OR :status <> 'pending' OR gateway_refund_id<>:refund)
            RETURNING is_primary
        """, refund=refund_id, status=status, payment=payment_id,
            receipt=refund.get("receipt"), order=order["id"]).mappings().first()
        if updated and updated["is_primary"] and status == "processed":
            run(connection, "UPDATE public.pass_orders SET closed_at=clock_timestamp() WHERE id=:id AND closed_at IS NULL",
                id=order["id"])

    def record_refund(self, refund, *, event_id=None):
        payment_id = refund.get("payment_id")
        if not gateway_id(payment_id, "pay"):
            raise PaymentError("invalid_refund", "Refund details require reconciliation.", 422)
        with self.database.transaction() as connection:
            if not self._event(connection, event_id, "refund." + str(refund.get("status"))):
                return
            order = run(connection, """
                SELECT o.* FROM public.pass_orders o
                JOIN public.pass_payments p ON p.order_id=o.id
                WHERE p.gateway_payment_id=:payment FOR UPDATE OF o
            """, payment=payment_id).mappings().one_or_none()
            if order is None:
                raise PaymentError("missing_capture", "The payment needs reconciliation first.", 503)
            self._apply_refund(connection, order, refund)

    def request_refund(self, payment_id, actor, request_id, reason):
        with self.database.transaction() as connection:
            order = run(connection, """
                SELECT o.id,o.amount FROM public.pass_orders o
                JOIN public.pass_payments p ON p.order_id=o.id
                WHERE p.gateway_payment_id=:payment FOR UPDATE OF o
            """, payment=payment_id).mappings().one_or_none()
            if order is None:
                raise PaymentError("payment_not_found", "Captured payment was not found.", 404)
            payment = run(connection, """
                SELECT * FROM public.pass_payments WHERE gateway_payment_id=:payment
            """, payment=payment_id).mappings().one()
            if payment["refund_status"] in {"processed", "pending"}:
                return dict(payment), order["amount"], False
            if payment["refund_status"] != "requested":
                payment = run(connection, """
                    UPDATE public.pass_payments SET refund_status='requested',refund_operation_id=:op,
                        refund_reason=:reason,gateway_refund_id=NULL WHERE gateway_payment_id=:payment
                    RETURNING *
                """, op=uuid4(), reason=reason, payment=payment_id).mappings().one()
                _audit(connection, actor, "pass.refund_requested", order["id"], request_id, reason,
                       payment_id=payment_id)
            return dict(payment), order["amount"], True

    def admin_queue(self, page, queue):
        filters = {
            "all": "true",
            "refund": "(p.refund_status IN ('requested','pending','failed') OR (p.refund_status IS NULL "
                      "AND (NOT p.is_primary OR p.received_after_cutoff OR p.confirmed_at>=s.ends_at "
                      "OR (p.gateway_payment_id IS NOT NULL AND o.closed_at IS NOT NULL))))",
            "checkout": "p.gateway_payment_id IS NULL AND o.closed_at IS NULL",
        }
        with self.database.read_only_transaction() as connection:
            season = self._season(connection)
            rows = run(connection, """
                SELECT o.*,s.ends_at,s.checkout_closes_at,p.gateway_payment_id,p.is_primary,p.confirmed_at,
                    p.refund_status,p.gateway_refund_id,p.refund_reason,p.received_after_cutoff
                FROM public.pass_orders o JOIN public.pass_seasons s ON s.id=o.season_id
                LEFT JOIN public.pass_payments p ON p.order_id=o.id
                WHERE """ + filters[queue] + """
                ORDER BY COALESCE(p.confirmed_at,o.created_at) DESC,o.id,p.gateway_payment_id LIMIT 31 OFFSET :offset
            """, offset=(page - 1) * 30).mappings().all()
            return {"items": [_view(row, season["server_time"], admin=True) for row in rows[:30]],
                    "has_more": len(rows) > 30,
                    "offer": {key: season[key] for key in ("standard_amount", "offer_amount", "offer_label",
                                                           "offer_starts_at", "offer_ends_at", "checkout_closes_at")}}

    def set_offer(self, actor, request_id, *, label=None, amount=None, starts_at=None, ends_at=None):
        with self.database.transaction() as connection:
            season = self._season(connection)
            if label is not None and (amount >= season["standard_amount"] or ends_at <= season["server_time"]
                                     or not starts_at < ends_at <= season["checkout_closes_at"]):
                raise PaymentError("invalid_offer", "Enter a lower price and an offer window ending before checkout closes.", 422)
            run(connection, """
                UPDATE public.pass_seasons SET offer_label=:label,offer_amount=:amount,
                  offer_starts_at=:starts,offer_ends_at=:ends WHERE id=:season
            """, label=label, amount=amount, starts=starts_at, ends=ends_at, season=SEASON)
            _audit(connection, actor, "pass.offer_updated", SEASON, request_id, label=label,
                   amount=amount, starts_at=starts_at, ends_at=ends_at)
        return {"saved": True}

    def set_test_access(self, test_id, required, actor, request_id):
        with self.database.transaction() as connection:
            row = run(connection, """
                UPDATE public.tests SET pass_required=:required WHERE id=:id AND (kind<>'pyq' OR NOT :required)
                RETURNING id
            """, id=test_id, required=required).scalar_one_or_none()
            if row is None:
                raise PaymentError("test_access_unavailable", "PYQ tests are always free, or the test was not found.", 422)
            _audit(connection, actor, "pass.test_access_updated", test_id, request_id, required=required)
        return {"pass_required": required}
