"""Create the owner-requested two-question test through existing authoring code.

Run from backend/. Requires the configured runtime database connection. The
request marker makes reruns return the existing test rather than create duplicates.
All authoring and audit writes commit together; no student attempt is started.
"""
import json
import sys
from contextlib import contextmanager
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.core.config import get_settings
from app.db.database import Database
from app.db.test_authoring import TestAuthoringRepository
from app.schemas.tests import CreateTestDraft, CreateTestVersion

ACTOR = '7367f508-253f-4a98-a06e-0236f198296c'
REQUEST = 'guided-six-minute-two-questions-20261116'


class AuthoringTransaction:
    def __init__(self, connection):
        self.connection = connection

    @contextmanager
    def transaction(self):
        yield self.connection


def main():
    settings = get_settings()
    assert settings.supabase_url.rstrip('/') == 'https://wcxxyyebcgofziylgwdg.supabase.co'
    db = Database(settings.database_url.get_secret_value())
    try:
        with db.engine.begin() as c:
            c.execute(text('SET LOCAL statement_timeout = 15000'))
            c.execute(text('SET LOCAL lock_timeout = 5000'))
            c.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:request,0))'), {'request': REQUEST})
            role = c.execute(text(
                "SELECT r.code FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id "
                "WHERE ur.user_id=:actor AND ur.revoked_at IS NULL"
            ), {'actor': UUID(ACTOR)}).scalars().all()
            assert role == ['super_administrator'], 'Expected the owner-approved administrator role.'
            existing = c.execute(text(
                "SELECT t.id FROM public.tests t JOIN public.admin_audit_log l ON l.entity_id=t.id::text "
                "WHERE l.request_id=:request AND l.action_code='test.created'"
            ), {'request': REQUEST}).scalar_one_or_none()
            if existing is None:
                questions = c.execute(text(
                    'SELECT id,exam,status,options,correct_option FROM public.questions WHERE id IN (1,9) ORDER BY id'
                )).mappings().all()
                assert len(questions) == 2, 'Expected both uploaded questions.'
                assert all(q['exam'] == 'NIMCET' and q['status'] == 'published'
                           and isinstance(q['options'], list) and len(q['options']) == 4
                           and q['correct_option'] is not None and 0 <= q['correct_option'] <= 3
                           for q in questions), 'A question is not ready for publication.'
                repository = TestAuthoringRepository(AuthoringTransaction(c))
                draft = repository.create_draft(
                    actor_id=ACTOR, request_id=REQUEST,
                    draft=CreateTestDraft(title='NIMCET 6-Minute Practice Test',
                                          kind='custom', visibility='public', examination_code='NIMCET'),
                )
                version = repository.create_version(
                    actor_id=ACTOR, test_id=draft['id'], request_id=REQUEST,
                    version=CreateTestVersion(
                        duration_seconds=360, attempt_limit=1,
                        sections=[{
                            'code': 'mathematics', 'title': 'Mathematics', 'display_order': 0,
                            'questions': [{'question_id': q['id'], 'display_order': i,
                                           'marks': '4', 'negative_marks': '1'}
                                          for i, q in enumerate(questions)],
                        }],
                    ),
                )
                repository.publish_version(actor_id=ACTOR, test_id=draft['id'],
                                           version_id=version['id'], request_id=REQUEST)
                test_id = UUID(draft['id'])
            else:
                test_id = existing
            result = c.execute(text(
                'SELECT t.id,t.title,t.status,v.id AS version_id,v.duration_seconds,v.attempt_limit,'
                'v.review_policy,count(q.id)::integer AS question_count,sum(q.marks) AS maximum_score,'
                'min(q.marks) AS minimum_question_marks,max(q.marks) AS maximum_question_marks,'
                'min(q.negative_marks) AS minimum_penalty,max(q.negative_marks) AS maximum_penalty '
                'FROM public.tests t JOIN public.test_versions v ON v.test_id=t.id '
                'JOIN public.test_sections s ON s.test_version_id=v.id '
                'JOIN public.test_questions q ON q.test_section_id=s.id '
                "WHERE t.id=:id AND v.status='published' GROUP BY t.id,v.id"
            ), {'id': test_id}).mappings().one()
            assert result['status'] == 'published' and result['duration_seconds'] == 360
            assert result['question_count'] == 2 and result['maximum_score'] == 8
            assert result['minimum_question_marks'] == result['maximum_question_marks'] == 4
            assert result['minimum_penalty'] == result['maximum_penalty'] == 1
            output = dict(result)
        print(json.dumps({'created': existing is None, 'test': output}, default=str))
    finally:
        db.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Keep database credentials and query parameters out of command output.
        print(json.dumps({'status': 'failed', 'error_type': type(exc).__name__}))
        raise SystemExit(1) from None
