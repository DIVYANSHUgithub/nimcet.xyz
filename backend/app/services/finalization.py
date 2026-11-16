import logging
from sqlalchemy import text

logger=logging.getLogger(__name__)


def finalize_expired(database, engine, *, limit=50, apply=False):
    """Bounded server-side expiration. Submission itself locks and is idempotent."""
    if not 1 <= limit <= 500:
        raise ValueError('Batch size must be between 1 and 500.')
    with database.read_only_transaction() as c:
        due=c.execute(text(
            "SELECT id,user_id FROM public.test_attempts WHERE status='in_progress' AND deadline_at<=clock_timestamp() "
            'ORDER BY deadline_at,id LIMIT :limit'
        ),{'limit':limit}).mappings().all()
    result={'due':len(due),'finalized':0,'failed':0,'dry_run':not apply}
    if not apply: return result
    for attempt in due:
        try:
            engine.submit_attempt(attempt_id=str(attempt['id']),user_id=str(attempt['user_id']))
            result['finalized']+=1
        except Exception as error:
            # A failure is retried on the next sweep while the attempt remains
            # active. Do not disclose exception text, SQL or student identities.
            logger.error('attempt_finalization_failed',extra={'error_type':type(error).__name__})
            result['failed']+=1
    return result
