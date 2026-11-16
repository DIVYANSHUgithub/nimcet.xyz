from datetime import UTC, datetime, timedelta
from decimal import Decimal
from contextlib import contextmanager
from uuid import uuid4

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient

from app.db.test_engine import _result_release_time, _review_release_time, AttemptNotFound
from app.db.phase5 import validate_paper_version, Phase5Repository
from app.domain.results import result_metrics
from app.schemas.pyq import PYQApprovalRequest
from app.core.config import Settings
from app.core.security import VerifiedIdentity
from app.main import create_app

NOW=datetime(2026,11,16,tzinfo=UTC)


def approval():
    return PYQApprovalRequest.model_validate(dict(paper=dict(examination_code='NIMCET',year=2025,original_title='Synthetic paper',
        duration_seconds=3600,source_citation='Synthetic test source, not a real paper',source_verification='verified',answer_key_verification='verified'),
        sections=[dict(code='MATH',question_count=2,marks=4,negative_marks=1)]))


def version():
    return dict(kind='pyq',status='draft',test_status='draft',examination_code='NIMCET',duration_seconds=3600,shuffle_questions=False,shuffle_options=False)


def rows():
    return [dict(code='MATH',section_order=0,question_order=i,marks=4,negative_marks=1,correct_option_snapshot=1,
                 options_snapshot=['a','b','c','d'],question_snapshot='Synthetic question') for i in range(2)]


def test_accuracy_has_explicit_denominators_and_empty_attempts():
    assert result_metrics(1,1,2)==dict(attempted_count=2,total_questions=4,accuracy_percentage=Decimal('50.00'),correct_percentage=Decimal('25.00'))
    assert result_metrics(0,0,4)['accuracy_percentage'] is None
    assert result_metrics(0,0,0)['correct_percentage'] is None


@pytest.mark.parametrize('mode',['never','at_time'])
def test_review_cannot_bypass_unreleased_results(mode):
    policy={'results':mode,'results_at':(NOW+timedelta(days=1)).isoformat(),'answers':'at_time','answers_at':(NOW-timedelta(days=1)).isoformat()}
    assert _result_release_time(policy,NOW-timedelta(hours=1),NOW) is None
    assert _review_release_time(policy,None,NOW) is None


def test_review_release_cannot_predate_result_release():
    policy={'answers':'at_time','answers_at':(NOW-timedelta(days=1)).isoformat()}
    assert _review_release_time(policy,NOW,NOW)==NOW


def test_complete_paper_blueprint_passes():
    validate_paper_version(version(),rows(),approval())


def test_approval_digest_detects_content_changes_that_keep_counts_and_marks():
    from app.db.phase5 import paper_snapshot_digest
    original=rows()
    approved=paper_snapshot_digest(version(),original)
    changed=[dict(row) for row in original]
    changed[0]['question_snapshot']='Different question, same count and marks'
    validate_paper_version(version(),changed,approval())
    assert paper_snapshot_digest(version(),changed)!=approved


@pytest.mark.parametrize('defect',['missing_question','order_gap','wrong_marks','wrong_answer','shuffle','wrong_duration','wrong_exam','already_published'])
def test_incomplete_or_changed_paper_is_rejected(defect):
    v=version(); q=rows()
    if defect=='missing_question': q=q[:1]
    if defect=='order_gap': q[1]['question_order']=4
    if defect=='wrong_marks': q[1]['marks']=3
    if defect=='wrong_answer': q[1]['correct_option_snapshot']=None
    if defect=='shuffle': v['shuffle_options']=True
    if defect=='wrong_duration': v['duration_seconds']=60
    if defect=='wrong_exam': v['examination_code']='OTHER'
    if defect=='already_published': v['status']='published'
    with pytest.raises(ValueError): validate_paper_version(v,q,approval())


def test_unverified_metadata_never_becomes_a_paper():
    data=approval().model_dump(mode='json'); data['paper']['answer_key_verification']='unverified'
    with pytest.raises(ValidationError): PYQApprovalRequest.model_validate(data)


class Result:
    def __init__(self,items): self.items=items
    def mappings(self): return self
    def all(self): return self.items
    def first(self): return self.items[0] if self.items else None


class AnalyticsDatabase:
    def __init__(self,items): self.items=items; self.calls=[]
    @contextmanager
    def read_only_transaction(self): yield self
    def execute(self,statement,params):
        self.calls.append((str(statement),params))
        return Result([] if 'section_results' in str(statement) else self.items)


def test_analytics_exclude_withheld_scores_and_bind_owner():
    user=uuid4()
    base=dict(id=uuid4(),status='submitted',submitted_at=NOW,server_time=NOW,score=Decimal(4),maximum_score=Decimal(8),correct_count=1,incorrect_count=1,unanswered_count=0)
    db=AnalyticsDatabase([{**base,'review_policy':{'results':'after_submit'}},{**base,'id':uuid4(),'review_policy':{'results':'never'},'score':Decimal(999)}])
    result=Phase5Repository(db).performance(str(user))
    assert result['released_attempts']==1 and len(result['recent'])==1
    assert result['recent'][0]['score']==Decimal(4)
    assert result['accuracy_percentage']==Decimal('50.00')
    assert all('a.user_id=:user' in sql and params['user']==user for sql,params in db.calls)


class Database:
    def close(self): pass
class Verifier:
    configured=True
    def verify(self,token): return VerifiedIdentity('22222222-2222-4222-8222-222222222222' if token=='other' else '11111111-1111-4111-8111-111111111111','issuer','authenticated')
class Resolver:
    def roles_for(self,identity): return frozenset({'student'})


def test_new_routes_require_authentication_and_admin_approval():
    app=create_app(Settings(_env_file=None,test_engine_enabled=True,phase5_enabled=True,log_level='CRITICAL'),database=Database(),token_verifier=Verifier(),role_resolver=Resolver())
    with TestClient(app) as c:
        assert c.get('/api/v1/pyq/papers').status_code==401
        assert c.get('/api/v1/students/me/performance').status_code==401
        response=c.post(f'/api/v1/admin/pyq/versions/{uuid4()}/approve',json=approval().model_dump(mode='json'),headers={'Authorization':'Bearer fixture'})
        assert response.status_code==403


class OwnedDatabase(Database):
    def __init__(self,policy): self.policy=policy
    @contextmanager
    def read_only_transaction(self): yield self
    def execute(self,statement,params):
        if 'user_id' not in params: return Result([])
        if str(params['user_id'])!='11111111-1111-4111-8111-111111111111': return Result([])
        return Result([dict(attempt_id=params['attempt_id'],status='submitted',test_id=uuid4(),test_title='Private fixture',
            submission_reason='student_submitted',submission_time=NOW,submitted_at=NOW,review_policy=self.policy,
            score=Decimal(4),maximum_score=Decimal(8),correct_count=1,incorrect_count=1,unanswered_count=0,
            released_at=None,server_time=NOW)])


@pytest.mark.parametrize('endpoint',['result','review'])
def test_real_result_repository_hides_foreign_and_unreleased_attempts(endpoint):
    attempt=str(uuid4())
    db=OwnedDatabase({'results':'after_submit','answers':'with_results'})
    app=create_app(Settings(_env_file=None,test_engine_enabled=True,log_level='CRITICAL'),database=db,token_verifier=Verifier(),role_resolver=Resolver())
    with TestClient(app) as c:
        assert c.get(f'/api/v1/attempts/{attempt}/{endpoint}',headers={'Authorization':'Bearer fixture'}).status_code==200
        foreign=c.get(f'/api/v1/attempts/{attempt}/{endpoint}',headers={'Authorization':'Bearer other'})
        assert foreign.status_code==404 and 'Private fixture' not in foreign.text
        db.policy={'results':'never','answers':'at_time','answers_at':(NOW-timedelta(days=1)).isoformat()}
        hidden=c.get(f'/api/v1/attempts/{attempt}/{endpoint}',headers={'Authorization':'Bearer fixture'})
        assert hidden.status_code==404 and 'Private fixture' not in hidden.text


def test_finalization_worker_is_dry_run_by_default_and_isolates_failures():
    from app.services.finalization import finalize_expired
    class Due(Database):
        @contextmanager
        def read_only_transaction(self): yield self
        def execute(self,statement,params):
            assert "deadline_at<=clock_timestamp()" in str(statement)
            assert params['limit']==2
            return Result([{'id':uuid4(),'user_id':uuid4()} for _ in range(2)])
    class Engine:
        def __init__(self): self.calls=[]
        def submit_attempt(self,**kwargs):
            self.calls.append(kwargs)
            if len(self.calls)==1: raise RuntimeError('Synthetic failure')
    engine=Engine()
    assert finalize_expired(Due(),engine,limit=2)['dry_run']
    assert engine.calls==[]
    summary=finalize_expired(Due(),engine,limit=2,apply=True)
    assert summary['finalized']==1 and summary['failed']==1
    with pytest.raises(ValueError): finalize_expired(Due(),engine,limit=501)


def test_paper_start_is_pinned_to_selected_version():
    from test_test_engine_api import _TestEngine
    version=uuid4(); test=uuid4(); calls=[]
    class PaperDatabase(Database):
        @contextmanager
        def read_only_transaction(self): yield self
        def execute(self,statement,params):
            assert params['id']==version
            return Result([(test,)])
    class Engine:
        def start_attempt(self,**kwargs):
            calls.append(kwargs)
            return _TestEngine._session()
    app=create_app(Settings(_env_file=None,test_engine_enabled=True,phase5_enabled=True,log_level='CRITICAL'),
                   database=PaperDatabase(),token_verifier=Verifier(),role_resolver=Resolver(),test_engine_repository=Engine())
    with TestClient(app) as c:
        response=c.post(f'/api/v1/pyq/papers/{version}/attempts',headers={'Authorization':'Bearer fixture'})
        assert response.status_code==201
    assert calls==[{'test_id':str(test),'version_id':str(version),'user_id':'11111111-1111-4111-8111-111111111111'}]
