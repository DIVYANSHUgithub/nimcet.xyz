
"""Small server-only Razorpay API client. Provider errors never expose payloads."""
import hashlib
import hmac
import re

import httpx2

from app.core.config import Settings


class GatewayUnavailable(Exception):
    pass


def signed(secret: str, payload: bytes, signature: str) -> bool:
    return (bool(re.fullmatch(r"[0-9a-f]{64}", signature))
            and hmac.compare_digest(hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest(), signature))


def gateway_id(value, prefix: str) -> bool:
    return isinstance(value, str) and bool(re.fullmatch(prefix + r"_[a-zA-Z0-9]{1,64}", value))


class Razorpay:
    def __init__(self, settings: Settings):
        self.settings = settings

    def request(self, method, path, *, payload=None, params=None, headers=None):
        if not self.settings.payments_configured:
            raise GatewayUnavailable
        try:
            with httpx2.Client(
                base_url="https://api.razorpay.com/v1",
                auth=(self.settings.razorpay_key_id, self.settings.razorpay_key_secret.get_secret_value()),
                timeout=5.0,
                follow_redirects=False,
                trust_env=False,
            ) as client:
                response = client.request(method, path, json=payload, params=params, headers=headers)
                response.raise_for_status()
                result = response.json()
                if not isinstance(result, dict):
                    raise ValueError
                return result
        except (httpx2.HTTPError, ValueError) as exc:
            raise GatewayUnavailable from exc

    def create_order(self, order):
        receipt = str(order["id"])
        try:
            return self.request("POST", "orders", payload={
                "amount": order["amount"], "currency": "INR", "receipt": receipt,
                "partial_payment": False,
            })
        except GatewayUnavailable:
            # Razorpay rejects repeated receipts. Recover an order created before a lost response.
            result = self.request("GET", "orders", params={"receipt": receipt, "count": 10})
            matches = [item for item in result.get("items", []) if item.get("receipt") == receipt]
            if len(matches) != 1:
                raise GatewayUnavailable from None
            return matches[0]

    def payment(self, payment_id):
        return self.request("GET", f"payments/{payment_id}")

    def payments(self, order_id):
        items = self.request("GET", f"orders/{order_id}/payments").get("items")
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            raise GatewayUnavailable
        return items

    def create_refund(self, payment, amount):
        identifier = str(payment["refund_operation_id"])
        return self.request("POST", f"payments/{payment['gateway_payment_id']}/refund",
                            payload={"amount": amount, "speed": "normal", "receipt": identifier},
                            headers={"X-Refund-Idempotency": identifier})

    def refunds(self, payment_id):
        return self.request("GET", f"payments/{payment_id}/refunds", params={"count": 100}).get("items", [])
