"""Run from backend: python scripts/finalize_expired_attempts.py [--apply].

Dry-run by default. Use --apply only against an explicitly approved environment.
Schedule externally; no browser or HTTP trigger is required.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings
from app.db.database import Database
from app.db.test_engine import TestEngineRepository
from app.services.finalization import finalize_expired


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--limit',type=int,default=50)
    args=parser.parse_args()
    settings=Settings()
    if not settings.database_url or not settings.test_engine_enabled:
        raise SystemExit('A configured test engine and database are required.')
    database=Database(settings.database_url.get_secret_value(), **settings.database_options())
    try:
        summary=finalize_expired(database,TestEngineRepository(database, phase5_enabled=settings.phase5_enabled),limit=args.limit,apply=args.apply)
        print(json.dumps(summary))
        return 1 if summary['failed'] else 0
    finally:
        database.close()


if __name__=='__main__':
    try:
        raise SystemExit(main())
    except Exception:
        # Driver messages can contain connection details. Preserve a failing exit
        # code for the scheduler without printing raw connection errors.
        print(json.dumps({'status':'failed','message':'Finalization sweep could not complete.'}))
        raise SystemExit(1) from None
