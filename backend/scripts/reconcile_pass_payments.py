
"""Reconcile pending Student Pass orders using the configured Razorpay account."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings
from app.db.database import Database
from app.db.payments import PaymentRepository
from app.services.pass_payments import reconcile_order
from app.services.razorpay import Razorpay


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=50, choices=range(1, 201), metavar="1-200")
    args = parser.parse_args()
    settings = Settings()
    if not (settings.payments_enabled and settings.payments_configured and settings.database_url):
        raise SystemExit("Configure the database and enable Student Pass payments to run reconciliation.")
    database = Database(settings.database_url.get_secret_value(), **settings.database_options())
    repository = PaymentRepository(database)
    gateway = Razorpay(settings)
    counts = {"checked": 0, "failed": 0}
    try:
        for order in repository.pending_orders(args.limit):
            try:
                reconcile_order(repository, gateway, order)
                counts["checked"] += 1
            except Exception:
                counts["failed"] += 1
        print(json.dumps(counts))
        return int(bool(counts["failed"]))
    finally:
        database.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        print(json.dumps({"status": "failed", "message": "Payment reconciliation could not complete."}))
        raise SystemExit(1) from None
