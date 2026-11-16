from io import BytesIO
from contextlib import contextmanager
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import VerifiedIdentity
from app.main import create_app
from app.schemas.content import QuestionDocument, QuestionWrite
from app.api.v1.routes.content import practice_feedback, sanitize_image
from app.db.content import ContentConflict


def document():
    ids = [str(uuid4()) for _ in range(4)]
    return dict(schema_version=1, statement=[{'type':'text','text':'What is 2 + 2?'}],
                options=[{'id':i,'blocks':[{'type':'text','text':str(n)}]} for n,i in enumerate(ids)],
                correct_option_id=ids[1], explanation=[{'type':'text','text':'Addition.'}], occurrences=[])


def payload():
    return dict(exam='NIMCET',exam_year=2026,section='Mathematics',question_number=1,
                subject='Mathematics',topic='Arithmetic',difficulty='easy',document=document())


@pytest.mark.parametrize('mutation', ['duplicate','missing_answer','empty_block','unsafe_image','unknown_field'])
def test_content_rejects_invalid_structure(mutation):
    doc = document()
    if mutation=='duplicate': doc['options'][1]['id']=doc['options'][0]['id']
    if mutation=='missing_answer': doc['correct_option_id']=str(uuid4())
    if mutation=='empty_block': doc['statement']=[{'type':'text','text':'  '}]
    if mutation=='unsafe_image': doc['statement']=[{'type':'image','url':'javascript:alert(1)','alt':'image'}]
    if mutation=='unknown_field': doc['html']='<script>alert(1)</script>'
    with pytest.raises(ValidationError): QuestionDocument.model_validate(doc)


def test_reordering_options_preserves_correct_identifier():
    doc=document()
    doc['options'].reverse()
    validated=QuestionDocument.model_validate(doc)
    feedback=practice_feedback({'content_document':validated.model_dump(mode='json')},doc['correct_option_id'])
    assert feedback['is_correct'] is True
    assert feedback['correct_option']==2


def test_practice_rejects_foreign_options_and_handles_legacy():
    row={'options':['A','B','C','D'],'correct_option':1,'explanation':'Reason'}
    assert practice_feedback(row,'option-1')['is_correct']
    with pytest.raises(HTTPException) as error: practice_feedback(row,'foreign')
    assert error.value.status_code==422


def test_publishing_requires_catalog_and_explanation():
    data=payload(); data['state']='published'
    with pytest.raises(ValidationError): QuestionWrite.model_validate(data)
    data['subtopic_id']=str(uuid4()); data['document']['explanation']=[]
    with pytest.raises(ValidationError): QuestionWrite.model_validate(data)


def test_media_reencodes_valid_image_and_rejects_fake_image():
    buffer=BytesIO(); Image.new('RGB',(2,2),'red').save(buffer,format='PNG')
    encoded,mime,extension=sanitize_image(buffer.getvalue()+b'<script>bad</script>')
    assert mime=='image/png' and extension=='png'
    assert b'<script>' not in encoded
    with Image.open(BytesIO(encoded)) as image: assert image.size==(2,2)
    for invalid in [b'<svg></svg>',b'\x89PNG\r\n\x1a\n',b'\xff\xd8\xffbad']:
        with pytest.raises(HTTPException): sanitize_image(invalid)


class Database:
    def close(self): pass


class Verifier:
    configured=True
    def verify(self, _token): return VerifiedIdentity(str(uuid4()),'issuer','authenticated')


class Resolver:
    def __init__(self, role): self.role=role
    def roles_for(self, _identity): return frozenset({self.role})


def client(role='student', enabled=True):
    return TestClient(create_app(settings=Settings(_env_file=None,question_authoring_enabled=enabled,log_level='CRITICAL'),
                     database=Database(),token_verifier=Verifier(),role_resolver=Resolver(role)))


@pytest.mark.parametrize('path', ['/admin/questions','/admin/catalog/subjects'])
def test_students_cannot_access_editorial_endpoints(path):
    with client() as c:
        assert c.get('/api/v1'+path,headers={'Authorization':'Bearer fixture'}).status_code==403


def test_disabled_authoring_does_not_query_database():
    with client('editor',enabled=False) as c:
        assert c.get('/api/v1/admin/questions',headers={'Authorization':'Bearer fixture'}).status_code==503


def test_editor_cannot_publish_question():
    data=payload(); data.update(state='published',subtopic_id=str(uuid4()))
    with client('editor') as c:
        response=c.post('/api/v1/admin/questions',json=data,headers={'Authorization':'Bearer fixture'})
        assert response.status_code==403


def test_revision_conflict_is_http_409(monkeypatch):
    import app.api.v1.routes.content as route
    class Repo:
        def save(self,*args): raise ContentConflict
    monkeypatch.setattr(route,'repository',lambda request:Repo())
    with client('editor') as c:
        response=c.put('/api/v1/admin/questions/1',json=payload(),headers={'Authorization':'Bearer fixture'})
        assert response.status_code==409
        assert response.json()['error']['code']=='revision_conflict'


def test_practice_feedback_is_separate_from_public_projection():
    from app.api.v1.routes.questions import public_item
    doc=document()
    row={'id':1,'status':'published','options':[], 'content_document':doc,'correct_option':1,'explanation':'Secret'}
    item=public_item(row).model_dump()
    assert not {'content_document','correct_option','explanation','correct_option_id'} & item.keys()
    assert item['option_ids']==[o['id'] for o in doc['options']]
    assert practice_feedback(row,doc['options'][0]['id'])['explanation_blocks']==doc['explanation']


def test_public_answer_reveal_requires_no_selected_option(monkeypatch):
    import app.api.v1.routes.content as route
    row = {'options': ['A', 'B', 'C', 'D'], 'correct_option': 2, 'explanation': 'Public explanation.'}
    class Repo:
        def get(self, question_id, public=False):
            assert public
            return row if question_id == 7 else None
    monkeypatch.setattr(route, 'repository', lambda request: Repo())
    with client() as c:
        response = c.get('/api/v1/questions/7/answer')
        assert response.status_code == 200
        assert response.json()['correct_option_id'] == 'option-2'
        assert response.json()['explanation'] == 'Public explanation.'
        assert response.json()['selected_option_id'] is None
        assert response.json()['is_correct'] is None
        assert c.get('/api/v1/questions/8/answer').status_code == 404


def test_http_practice_validates_then_reveals_feedback(monkeypatch):
    import app.api.v1.routes.content as route
    row={'options':['A','B','C','D'],'correct_option':2,'explanation':'Explanation after answer.'}
    class Repo:
        def get(self, question_id, public=False):
            assert question_id==7 and public
            return row
    monkeypatch.setattr(route,'repository',lambda request:Repo())
    with client() as c:
        invalid=c.post('/api/v1/questions/7/practice',json={'option_id':'other-question-option'})
        assert invalid.status_code==422
        assert 'Explanation after answer.' not in invalid.text
        valid=c.post('/api/v1/questions/7/practice',json={'option_id':'option-1'})
        assert valid.status_code==200
        assert valid.json()['is_correct'] is False
        assert valid.json()['correct_option']==2
        assert valid.json()['explanation']==row['explanation']


@pytest.mark.parametrize('role',['editor','test_manager','administrator','super_administrator'])
def test_authors_can_create_drafts_with_backend_actor(monkeypatch,role):
    import app.api.v1.routes.content as route
    class Repo:
        def save(self, question_id, body, actor, request_id):
            assert question_id is None and actor and request_id
            assert body.state=='draft'
            return {'id':123,'revision':1}
    monkeypatch.setattr(route,'repository',lambda request:Repo())
    with client(role) as c:
        response=c.post('/api/v1/admin/questions',json=payload(),headers={'Authorization':'Bearer fixture'})
        assert response.status_code==201


def test_invalid_upload_never_contacts_storage(monkeypatch):
    import app.api.v1.routes.content as route
    monkeypatch.setattr(route,'repository',lambda request:object())
    def storage(*args): raise AssertionError('Invalid file must never reach storage')
    monkeypatch.setattr(route,'storage',storage)
    with client('editor') as c:
        assert c.post('/api/v1/admin/media',content=b'<svg><script/></svg>',headers={'Authorization':'Bearer fixture'}).status_code==422
        assert c.post('/api/v1/admin/media',content=b'x'*5242881,headers={'Authorization':'Bearer fixture'}).status_code==413


def test_media_upload_registers_and_audits_without_exposing_credentials(monkeypatch):
    import app.api.v1.routes.content as route
    calls=[]
    statements=[]
    monkeypatch.setattr(route,'storage',lambda request,path,method,data,mime:calls.append((path,method,mime)))
    class Connection:
        def execute(self, statement, params): statements.append(str(statement))
    class MediaDatabase(Database):
        @contextmanager
        def transaction(self): yield Connection()
    image=BytesIO(); Image.new('RGB',(2,2)).save(image,format='PNG')
    with client('editor') as c:
        c.app.state.database=MediaDatabase()
        response=c.post('/api/v1/admin/media',content=image.getvalue(),headers={'Authorization':'Bearer fixture'})
        assert response.status_code==201
        assert set(response.json())=={'id','url'}
        assert len(calls)==1 and calls[0][1:] == ('POST','image/png')
        assert len(statements)==2
        assert 'question_media' in statements[0] and 'admin_audit_log' in statements[1]


def test_pyq_metadata_filters_match_the_same_occurrence():
    from app.db.questions import _where_clause
    sql, params = _where_clause({'exam':'NIMCET','section':'Math','year':2025,'pyq':True},rich_content=True)
    assert 'o.exam=:exam AND o.section=:section AND o.year=:year' in sql
    assert 'q.exam_year = :year' not in sql
    assert params['year']==2025
