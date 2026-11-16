from contextlib import contextmanager
from uuid import UUID, uuid4
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import create_app
from app.core.config import Settings
from app.core.security import VerifiedIdentity
from app.db.content import ContentConflict
from app.db.operations import OperationsRepository, OperationDenied, check_transition
from app.db.roles import AccountSuspended, DatabaseRoleResolver
from app.schemas.operations import RoleReplacement, ReviewChange, AccountChange
from app.services.auth_directory import AuthDirectory
from app.db.test_authoring import TestAuthoringRepository
from app.domain.test_engine import TestEngineForbidden

ACTOR=uuid4()
TARGET=uuid4()
REASON='Reviewed by authorized project administrator'

class Result:
    def __init__(self,value=None): self.value=value
    def mappings(self): return self
    def scalars(self): return self
    def all(self): return self.value or []
    def first(self): return self.value
    def one(self): return self.value
    def scalar_one(self): return self.value
    def scalar_one_or_none(self): return self.value

class Database:
    def __init__(self,values=()): self.values=iter(values);self.statements=[];self.rolled_back=False
    def execute(self,statement,params=None):
        self.statements.append((str(statement),params))
        return Result(next(self.values,None))
    @contextmanager
    def transaction(self):
        try: yield self
        except Exception:
            self.rolled_back=True
            raise
    read_only_transaction=transaction
    def close(self): pass

class Verifier:
    configured=True
    def verify(self,token): return VerifiedIdentity(str(ACTOR),'https://test.example/auth/v1','authenticated')

class Resolver:
    def __init__(self,role): self.role=role
    def roles_for(self,identity):
        if self.role=='suspended': raise AccountSuspended
        return frozenset([self.role])

def client(role,enabled=True,trusted=True):
    settings=Settings(_env_file=None,log_level='CRITICAL',admin_workflows_enabled=enabled,trusted_role_lookup_enabled=trusted,test_engine_enabled=True)
    app=create_app(settings=settings,database=Database(),token_verifier=Verifier(),role_resolver=Resolver(role))
    return TestClient(app,raise_server_exceptions=False)

@pytest.mark.parametrize('state,action,reviewer,expected',[
 ('draft','submit',False,'submitted'),('rejected','submit',False,'submitted'),('submitted','withdraw',False,'draft'),
 ('submitted','approve',True,'approved'),('submitted','reject',True,'rejected')])
def test_valid_review_transitions(state,action,reviewer,expected):
    assert check_transition(state,action,reviewer)==expected

@pytest.mark.parametrize('state,action,reviewer,exception',[
 ('draft','approve',True,ContentConflict),('approved','submit',True,ContentConflict),
 ('submitted','approve',False,OperationDenied),('submitted','reject',False,OperationDenied)])
def test_review_cannot_skip_states_or_escalate(state,action,reviewer,exception):
    with pytest.raises(exception):check_transition(state,action,reviewer)

def test_stale_workflow_revision_rolls_back_without_audit():
    db=Database([{'status':'draft','test_status':'draft','workflow_state':'submitted','workflow_revision':2}])
    with pytest.raises(ContentConflict): OperationsRepository(db).transition(uuid4(),ReviewChange(action='approve',reason=REASON,expected_revision=1),ACTOR,True,'test')
    assert db.rolled_back and len(db.statements)==1

def test_primary_role_replacement_requires_expected_role_and_preserves_last_owner():
    db=Database([None,[{'code':'student','assignment_id':uuid4()}]])
    with pytest.raises(ContentConflict):OperationsRepository(db).replace_role(TARGET,'editor',REASON,ACTOR,'test',None)
    assert db.rolled_back and not any('UPDATE public.user_roles' in sql for sql,_ in db.statements)
    db=Database([None,[{'code':'super_administrator','assignment_id':uuid4()}],1])
    with pytest.raises(OperationDenied):OperationsRepository(db).replace_role(TARGET,'student',REASON,ACTOR,'test','super_administrator')
    assert db.rolled_back

def test_role_change_revokes_and_grants_inside_audited_transaction():
    db=Database([None,[{'code':'student','assignment_id':uuid4()}],2,None,None,None])
    assert OperationsRepository(db).replace_role(TARGET,'editor',REASON,ACTOR,'test','student')=={'role':'editor','unchanged':False}
    assert 'pg_advisory_xact_lock' in db.statements[0][0]
    assert 'UPDATE public.user_roles' in db.statements[3][0]
    assert 'INSERT INTO public.user_roles' in db.statements[4][0]
    assert db.statements[-1][1]['action']=='role.replaced'

def test_cannot_change_own_role_or_suspend_privileged_account():
    with pytest.raises(OperationDenied):OperationsRepository(Database()).replace_role(ACTOR,'student',REASON,ACTOR,'test')
    db=Database([None,1])
    with pytest.raises(OperationDenied):OperationsRepository(db).account(TARGET,AccountChange(status='suspended',reason=REASON),ACTOR,'test')
    assert db.rolled_back

def test_suspended_user_is_denied_before_role_resolution():
    db=Database([1])
    with pytest.raises(AccountSuspended):DatabaseRoleResolver(db,check_account_status=True).roles_for(VerifiedIdentity(str(TARGET),'issuer','authenticated'))
    assert len(db.statements)==1

def test_active_attempt_answer_keys_are_never_returned():
    db=Database([{'status':'in_progress'}])
    with pytest.raises(OperationDenied):OperationsRepository(db).attempt_detail(uuid4(),REASON,ACTOR,'test')
    assert len(db.statements)==1 and db.rolled_back

def test_completed_attempt_read_is_audited_and_uses_stored_result():
    db=Database([{'status':'submitted'},{'score':7},[],[],None])
    assert OperationsRepository(db).attempt_detail(uuid4(),REASON,ACTOR,'test')['result']=={'score':7}
    assert db.statements[-1][1]['action']=='attempt.reviewed'

def test_publish_requires_general_approval():
    db=Database([{'test_status':'draft','status':'draft','workflow_state':'submitted'}])
    with pytest.raises(TestEngineForbidden) as error:TestAuthoringRepository(db,workflows_enabled=True).publish_version(actor_id=str(ACTOR),test_id=str(uuid4()),version_id=str(uuid4()),request_id='test')
    assert str(error.value)=='approval_required'

def test_directory_projection_ignores_untrusted_roles_and_secrets():
    result=AuthDirectory.project({'id':str(TARGET),'email':'test@example.test','email_confirmed_at':None,'user_metadata':{'full_name':'Fixture','role':'super_administrator'},'app_metadata':{'roles':['super_administrator']},'encrypted_password':'secret'})
    assert result['name']=='Fixture' and result['email_verified'] is False
    assert set(result)=={'id','email','name','email_verified','created_at','last_sign_in_at'}

@pytest.mark.parametrize('method,path,role,payload',[
 ('get','users','student',None),('get','attempts','editor',None),('get','review-queue','test_manager',None),
 ('get','activity','administrator',None),('put',f'users/{TARGET}/primary-role','administrator',{'role':'editor','expected_role':'student','reason':REASON}),
 ('post',f'attempts/{uuid4()}/review','test_manager',{'reason':REASON})])
def test_operations_route_permission_matrix(method,path,role,payload):
    with client(role) as c:
        response=c.request(method,'/api/v1/admin/'+path,headers={'Authorization':'Bearer fixture'},json=payload)
    assert response.status_code==403

def test_feature_gate_and_suspension_fail_closed():
    with client('administrator',enabled=False) as c:
        assert c.get('/api/v1/admin/users',headers={'Authorization':'Bearer fixture'}).status_code==503
    with client('student',trusted=False) as c:
        assert c.get('/api/v1/auth/me',headers={'Authorization':'Bearer fixture'}).status_code==503
    with client('suspended') as c:
        response=c.get('/api/v1/auth/me',headers={'Authorization':'Bearer fixture'})
        assert response.status_code==403 and response.json()['error']['code']=='account_suspended'

@pytest.mark.parametrize('data',[
 {'role':'editor','reason':REASON},
 {'role':'owner','expected_role':'student','reason':REASON},
 {'role':'editor','expected_role':'student','reason':'short'},
 {'role':'editor','expected_role':'student','reason':REASON,'metadata':{'role':'super_administrator'}}])
def test_role_payload_rejects_ambiguous_or_untrusted_input(data):
    with pytest.raises(ValidationError):RoleReplacement.model_validate(data)


def test_directory_pagination_projects_safe_fields_without_network(monkeypatch):
    directory=AuthDirectory(Settings(_env_file=None))
    monkeypatch.setattr(directory,'request',lambda path: {'users':[{'id':str(TARGET),'user_metadata':{'roles':['administrator']}}]})
    data=directory.page(2)
    assert data['page']==2 and data['has_more'] is False and 'roles' not in data['items'][0]


def test_directory_rejects_malformed_or_wrong_target_response(monkeypatch):
    from app.services.auth_directory import DirectoryUnavailable
    directory=AuthDirectory(Settings(_env_file=None))
    monkeypatch.setattr(directory,'request',lambda path: {'users':'wrong'})
    with pytest.raises(DirectoryUnavailable):directory.page(1)
    monkeypatch.setattr(directory,'request',lambda path: {'id':str(ACTOR)})
    with pytest.raises(DirectoryUnavailable):directory.get(TARGET)


def test_referenced_media_cannot_be_archived():
    from app.schemas.operations import ArchiveMedia
    db=Database([{'id':uuid4()},True])
    with pytest.raises(ContentConflict):OperationsRepository(db).archive_media(uuid4(),ArchiveMedia(reason=REASON),ACTOR,'test')
    assert db.rolled_back and len(db.statements)==2


def test_suspended_user_cannot_receive_privileged_primary_role():
    db=Database([None,[{'code':'student','assignment_id':uuid4()}],1])
    with pytest.raises(ValueError):OperationsRepository(db).replace_role(TARGET,'administrator',REASON,ACTOR,'test','student')
    assert db.rolled_back and not any('UPDATE public.user_roles' in sql for sql,_ in db.statements)


def test_availability_cannot_resume_unpublished_or_archived_tests():
    from app.schemas.operations import TestAvailability
    payload=TestAvailability(available=True,reason=REASON)
    db=Database([{'status':'draft'},False])
    with pytest.raises(ValueError):OperationsRepository(db).availability(uuid4(),payload,ACTOR,'test')
    assert db.rolled_back
    db=Database([{'status':'archived'}])
    with pytest.raises(ContentConflict):OperationsRepository(db).availability(uuid4(),payload,ACTOR,'test')
    assert db.rolled_back
