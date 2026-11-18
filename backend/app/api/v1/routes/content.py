import json
from uuid import UUID, uuid4
from io import BytesIO
import warnings
from urllib.error import URLError
from urllib.request import Request as URLRequest, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import require_roles
from app.core.security import Principal
from app.db.content import CATALOG, ContentConflict, ContentNotFound, ContentRepository, audit
from app.db.database import DatabaseUnavailable
from app.domain.question_content import option_ids
from app.schemas.content import CatalogWrite, PracticeAnswer, QuestionWrite
from sqlalchemy import text
from PIL import Image, UnidentifiedImageError

router = APIRouter()
AUTHORS = ('editor', 'test_manager', 'administrator', 'super_administrator')


def repository(request: Request):
    if not request.app.state.settings.question_authoring_enabled:
        raise HTTPException(503, detail={'code':'content_not_enabled','message':'Question management is awaiting database setup.'})
    return ContentRepository(request.app.state.database,workflows_enabled=request.app.state.settings.admin_workflows_enabled)


def translate(operation):
    try:
        return operation()
    except ContentNotFound:
        raise HTTPException(404, detail={'code':'content_not_found','message':'The requested content is unavailable.'}) from None
    except ContentConflict:
        raise HTTPException(409, detail={'code':'revision_conflict','message':'Reload the question before saving; it has changed.'}) from None
    except ValueError:
        raise HTTPException(422, detail={'code':'invalid_content','message':'Check the catalog relationships and media references.'}) from None
    except DatabaseUnavailable as exc:
        sqlstate = getattr(getattr(exc.__cause__, 'orig', None), 'sqlstate', None)
        if sqlstate == '23505':
            raise HTTPException(409, detail={'code':'duplicate_content','message':'A record already uses this code or examination position.'}) from None
        if sqlstate == '23503':
            raise HTTPException(422, detail={'code':'invalid_reference','message':'The selected catalog reference is unavailable.'}) from None
        raise HTTPException(503, detail={'code':'content_storage_unavailable','message':'Content storage is temporarily unavailable.'}) from None


@router.get('/admin/catalog/{kind}')
def catalog(kind: str, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    if kind not in CATALOG:
        raise HTTPException(404)
    return translate(lambda: repository(request).catalog(kind))


@router.get('/catalog')
def public_catalog(request: Request):
    def operation():
        repo = repository(request)
        result = {}
        for kind in CATALOG:
            parent = {'sections':'examinations','subjects':'examinations','topics':'subjects','subtopics':'topics'}.get(kind)
            parent_ids = {str(row['id']) for row in result.get(parent, [])}
            result[kind] = [row for row in repo.catalog(kind) if row['status']=='active'
                            and (not parent or str(row['parent_id']) in parent_ids)]
        return result
    return translate(operation)


@router.post('/admin/catalog/{kind}', status_code=201)
def create_catalog(kind: str, payload: CatalogWrite, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    if kind not in CATALOG:
        raise HTTPException(404)
    return translate(lambda: repository(request).save_catalog(kind,payload,principal.user_id,request.state.request_id))


@router.put('/admin/catalog/{kind}/{item_id}')
def update_catalog(kind: str, item_id: UUID, payload: CatalogWrite, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    if kind not in CATALOG:
        raise HTTPException(404)
    return translate(lambda: repository(request).save_catalog(kind,payload,principal.user_id,request.state.request_id,item_id))


@router.get('/admin/questions')
def list_questions(request: Request, page: int = Query(1,ge=1), search: str = Query('',max_length=120), state: str = Query('',pattern='^(|draft|review|published|archived)$'), exam: str = Query('',max_length=80), subject: str = Query('',max_length=200), principal: Principal = Depends(require_roles(*AUTHORS))):
    return translate(lambda: repository(request).list_questions(page,search,state,exam,subject))


@router.get('/admin/questions/{question_id}')
def get_question(question_id: int, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    return translate(lambda: repository(request).get(question_id))


def save(request, principal, payload, question_id=None):
    if payload.state == 'published' and not principal.roles.intersection({'administrator','super_administrator'}):
        raise HTTPException(403, detail={'code':'publication_forbidden','message':'An administrator must publish the question.'})
    return translate(lambda: repository(request).save(question_id,payload,principal.user_id,request.state.request_id))


@router.post('/admin/questions', status_code=201)
def create_question(payload: QuestionWrite, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    return save(request,principal,payload)


@router.put('/admin/questions/{question_id}')
def update_question(question_id: int, payload: QuestionWrite, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    return save(request,principal,payload,question_id)


def practice_feedback(row, option_id):
    doc = row.get('content_document')
    ids = [o['id'] for o in doc['options']] if doc else option_ids(row['options'])
    if option_id is not None and option_id not in ids:
        raise HTTPException(422, detail={'code':'invalid_option','message':'Select an option belonging to this question.'})
    index = ids.index(doc['correct_option_id']) if doc else row['correct_option']
    if index is None:
        raise HTTPException(409, detail={'code':'answer_unavailable','message':'An answer is not available.'})
    return {'selected_option_id':option_id,'correct_option_id':ids[index],
            'correct_option':index,'is_correct':option_id==ids[index] if option_id is not None else None,
            'explanation':row.get('explanation') or '',
            'explanation_blocks':doc['explanation'] if doc else []}


@router.get('/questions/{question_id}/answer')
def published_answer(question_id: int, request: Request):
    # Published question answers are intentionally public. Revealing one does not
    # submit a choice or create a practice/exam attempt.
    from app.db.questions import QuestionsRepository
    def operation():
        row = (repository(request).get(question_id,public=True) if request.app.state.settings.question_authoring_enabled
               else QuestionsRepository(request.app.state.database).get_published(str(question_id)))
        if row is None:
            raise ContentNotFound
        return practice_feedback(row, None)
    return translate(operation)


@router.post('/questions/{question_id}/practice')
def practice(question_id: int, payload: PracticeAnswer, request: Request):
    # A read-only operation: the answer is evaluated on the server, never supplied
    # by the browser. No exam attempt or scoring record is changed.
    from app.db.questions import QuestionsRepository
    def operation():
        row = (repository(request).get(question_id,public=True) if request.app.state.settings.question_authoring_enabled
               else QuestionsRepository(request.app.state.database).get_published(str(question_id)))
        if row is None:
            raise ContentNotFound
        if payload.expected_revision is not None and payload.expected_revision != row.get('revision', 0):
            raise ContentConflict
        return practice_feedback(row,payload.option_id)
    return translate(operation)


def image_type(data):
    if data.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png', 'png'
    if data.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg', 'jpg'
    if data[:4]==b'RIFF' and data[8:12]==b'WEBP':
        return 'image/webp', 'webp'
    raise HTTPException(422, detail={'code':'invalid_image','message':'Upload a PNG, JPEG or WebP image.'})


def sanitize_image(data):
    mime, extension = image_type(data)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(data), formats=['PNG','JPEG','WEBP']) as image:
                if image.format not in {'PNG','JPEG','WEBP'} or image.width * image.height > 16000000:
                    raise ValueError('Image dimensions exceed the limit.')
                image.load()
                clean = Image.new('RGBA' if 'A' in image.getbands() else 'RGB', image.size)
                clean.paste(image)
                output = BytesIO()
                clean.save(output, format={'png':'PNG','jpg':'JPEG','webp':'WEBP'}[extension])
                encoded = output.getvalue()
                if len(encoded) > 5242880:
                    raise ValueError('Encoded image exceeds the limit.')
                return encoded, mime, extension
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(422, detail={'code':'invalid_image','message':'Upload a valid image of at most 16 megapixels and 5 MB.'}) from None


def storage(request, path, method='GET', data=None, content_type=None):
    settings = request.app.state.settings
    if not settings.supabase_storage_key or not settings.supabase_url:
        raise HTTPException(503, detail={'code':'storage_not_configured','message':'Media storage is not configured.'})
    key = settings.supabase_storage_key.get_secret_value()
    url = f'{settings.supabase_url.rstrip("/")}/storage/v1/object/{settings.storage_bucket}/{path}'
    headers = {'Authorization':f'Bearer {key}','apikey':key}
    if content_type:
        headers['Content-Type']=content_type
    try:
        with urlopen(URLRequest(url,data=data,method=method,headers=headers),timeout=15) as response:
            return response.read(5242881)
    except (URLError, TimeoutError, OSError):
        raise HTTPException(503, detail={'code':'media_unavailable','message':'Media storage is temporarily unavailable.'}) from None


@router.post('/admin/media', status_code=201)
async def upload_media(request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    repository(request)
    data = bytearray()
    async for chunk in request.stream():
        if len(data)+len(chunk)>5242880:
            raise HTTPException(413,detail={'code':'image_too_large','message':'The maximum image size is 5 MB.'})
        data.extend(chunk)
    encoded, mime, extension = await run_in_threadpool(sanitize_image, bytes(data))
    media_id=uuid4()
    path=f'{principal.user_id}/{media_id}.{extension}'
    await run_in_threadpool(storage,request,path,'POST',encoded,mime)
    def persist():
        with request.app.state.database.transaction() as c:
            c.execute(text('INSERT INTO public.question_media(id,object_path,content_type,byte_size,created_by) VALUES (:id,:path,:type,:size,:actor)'),
                      dict(id=media_id,path=path,type=mime,size=len(encoded),actor=principal.user_id))
            audit(c,principal.user_id,'media.uploaded',media_id,request.state.request_id)
    try:
        await run_in_threadpool(persist)
    except DatabaseUnavailable:
        # Uploaded objects are immutable. A failed registration is not reported as
        # success; its unreferenced object can be removed by an operator later.
        raise HTTPException(503,detail={'code':'media_registration_failed','message':'The upload could not be registered. Please retry.'}) from None
    return {'id':str(media_id),'url':f'/api/v1/media/{media_id}'}


@router.get('/media/{media_id}')
def read_media(media_id: UUID, request: Request):
    repository(request)
    # Snapshot images are served by the attempt route, where review rules apply.
    def lookup():
        with request.app.state.database.read_only_transaction() as c:
            return c.execute(text(
                "SELECT m.object_path,m.content_type FROM public.question_media m WHERE m.id=:id AND (EXISTS "
                "(SELECT 1 FROM public.questions q WHERE q.status='published' AND ("
                "EXISTS (SELECT 1 FROM jsonb_array_elements(q.content_document->'statement') b WHERE b->>'media_id'=:needle) OR "
                "EXISTS (SELECT 1 FROM jsonb_array_elements(q.content_document->'explanation') b WHERE b->>'media_id'=:needle) OR "
                "EXISTS (SELECT 1 FROM jsonb_array_elements(q.content_document->'options') o, "
                "LATERAL jsonb_array_elements(o->'blocks') b WHERE b->>'media_id'=:needle) OR "
                "(q.content_document IS NULL AND ("
                "to_jsonb(q.question) @> CAST(:image AS jsonb) OR "
                "to_jsonb(q.question) @> CAST(:blocks AS jsonb) OR "
                "to_jsonb(q.question) @> CAST(:statement AS jsonb) OR "
                "to_jsonb(q.question) @> CAST(:single AS jsonb) OR "
                "q.options @> CAST(:option AS jsonb))))))"
            ), references).mappings().first()
    image = {'type': 'image', 'media_id': str(media_id)}
    references = dict(
        id=media_id, needle=str(media_id), image=json.dumps([image]),
        blocks=json.dumps({'blocks': [image]}), statement=json.dumps({'statement': [image]}),
        single=json.dumps(image), option=json.dumps([{'blocks': [image]}]),
    )
    row=translate(lookup)
    if row is None:
        raise HTTPException(404)
    return Response(storage(request,row['object_path']),media_type=row['content_type'],
                    headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})


@router.get('/admin/media/{media_id}')
def preview_media(media_id: UUID, request: Request, principal: Principal = Depends(require_roles(*AUTHORS))):
    repository(request)
    return read_registered_media(media_id, request)


def read_registered_media(media_id: UUID, request: Request):
    def lookup():
        with request.app.state.database.read_only_transaction() as c:
            return c.execute(text('SELECT object_path,content_type FROM public.question_media WHERE id=:id'), {'id':media_id}).mappings().first()
    row = translate(lookup)
    if row is None:
        raise HTTPException(404)
    return Response(storage(request,row['object_path']),media_type=row['content_type'],
                    headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'})
