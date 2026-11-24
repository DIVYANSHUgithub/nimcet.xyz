from uuid import UUID
from fastapi import APIRouter,Depends,HTTPException,Query,Request

from app.api.dependencies import require_roles
from app.api.v1.routes.content import translate
from app.db.operations import OperationsRepository,OperationDenied
from app.db.content import ContentConflict
from app.schemas.operations import Reason,RoleReplacement,AccountChange,ReviewChange,TestMetadata,ArchiveMedia,TestAvailability
from app.services.auth_directory import AuthDirectory,DirectoryNotConfigured,DirectoryUnavailable,DirectoryUserMissing

router=APIRouter()
AUTHORS=('editor','test_manager','administrator','super_administrator')
MANAGERS=('test_manager','administrator','super_administrator')
ADMINS=('administrator','super_administrator')


def repository(request):
    if not request.app.state.settings.admin_workflows_enabled or not request.app.state.settings.trusted_role_lookup_enabled:
        raise HTTPException(503,detail={'code':'admin_workflows_not_enabled','message':'Administrative workflows are awaiting activation.'})
    return OperationsRepository(request.app.state.database)


def execute(operation):
    def call():
        try: return operation()
        except ContentConflict:
            raise HTTPException(409,detail={'code':'revision_conflict','message':'The record changed or this workflow action is unavailable. Reload before trying again.'}) from None
        except ValueError:
            raise HTTPException(422,detail={'code':'invalid_operation','message':'Check account verification, configuration and workflow requirements.'}) from None
    try: return translate(call)
    except OperationDenied: raise HTTPException(403,detail={'code':'operation_forbidden','message':'This account operation is not permitted.'}) from None
    except DirectoryNotConfigured: raise HTTPException(503,detail={'code':'directory_not_configured','message':'Users & roles requires SUPABASE_ADMIN_KEY on the backend.'}) from None
    except DirectoryUnavailable: raise HTTPException(503,detail={'code':'directory_unavailable','message':'The account directory is unavailable.'}) from None
    except DirectoryUserMissing: raise HTTPException(404,detail={'code':'user_not_found','message':'The account was not found.'}) from None


@router.get('/capabilities')
def capabilities(request:Request,principal=Depends(require_roles(*AUTHORS))):
    s=request.app.state.settings
    return {'questions':s.question_authoring_enabled,'tests':s.test_engine_enabled,'pyq':s.phase5_enabled,
            'workflows':s.admin_workflows_enabled and s.trusted_role_lookup_enabled,
            'directory':bool(s.supabase_url and s.supabase_admin_key) and s.admin_workflows_enabled,
            'media_storage':bool(s.supabase_url and s.supabase_storage_key),
            'student_pass':s.payments_enabled and s.payment_admin_configured}


@router.get('/operations/summary')
def summary(request:Request,principal=Depends(require_roles(*ADMINS))): return execute(lambda:repository(request).summary())


@router.get('/operations/recent-activity')
def recent_activity(request:Request,principal=Depends(require_roles(*AUTHORS))):
    return execute(lambda:repository(request).activity(1,'','',UUID(principal.user_id))[:5])


@router.get('/tests/{test_id}/versions')
def versions(test_id:UUID,request:Request,principal=Depends(require_roles(*MANAGERS))): return execute(lambda:repository(request).versions(test_id))


@router.get('/versions/{version_id}')
def version(version_id:UUID,request:Request,principal=Depends(require_roles(*MANAGERS))): return execute(lambda:repository(request).version(version_id))


@router.post('/versions/{version_id}/review')
def review(version_id:UUID,payload:ReviewChange,request:Request,principal=Depends(require_roles(*MANAGERS))):
    return execute(lambda:repository(request).transition(version_id,payload,UUID(principal.user_id),bool(principal.roles.intersection(ADMINS)),request.state.request_id))


@router.get('/review-queue')
def queue(request:Request,page:int=Query(1,ge=1),principal=Depends(require_roles(*ADMINS))): return execute(lambda:repository(request).review_queue(page))


@router.put('/tests/{test_id}/metadata')
def metadata(test_id:UUID,payload:TestMetadata,request:Request,principal=Depends(require_roles(*ADMINS))):
    return execute(lambda:repository(request).metadata(test_id,payload.title,payload.reason,UUID(principal.user_id),request.state.request_id))


@router.post('/tests/{test_id}/archive')
def archive_test(test_id:UUID,payload:Reason,request:Request,principal=Depends(require_roles(*ADMINS))):
    return execute(lambda:repository(request).archive_test(test_id,payload.reason,UUID(principal.user_id),request.state.request_id))


@router.put('/tests/{test_id}/availability')
def availability(test_id:UUID,payload:TestAvailability,request:Request,principal=Depends(require_roles(*ADMINS))):
    return execute(lambda:repository(request).availability(test_id,payload,UUID(principal.user_id),request.state.request_id))


@router.get('/users')
def users(request:Request,page:int=Query(1,ge=1),principal=Depends(require_roles(*ADMINS))):
    def operation():
        repo=repository(request); data=AuthDirectory(request.app.state.settings).page(page)
        states=repo.user_states([UUID(item['id']) for item in data['items']])
        return {**data,'items':[{**item,**states[item['id']]} for item in data['items']]}
    return execute(operation)


@router.get('/users/{user_id}')
def user(user_id:UUID,request:Request,principal=Depends(require_roles(*ADMINS))):
    def operation():
        repo=repository(request); data=AuthDirectory(request.app.state.settings).get(user_id)
        return {**data,**repo.user_states([user_id])[str(user_id)]}
    return execute(operation)


@router.put('/users/{user_id}/primary-role')
def role(user_id:UUID,payload:RoleReplacement,request:Request,principal=Depends(require_roles('super_administrator'))):
    def operation():
        repo=repository(request)
        if user_id==UUID(principal.user_id): raise OperationDenied
        target=AuthDirectory(request.app.state.settings).get(user_id)
        if payload.role!='student' and not target['email_verified']: raise ValueError('Account must be confirmed.')
        return repo.replace_role(user_id,payload.role,payload.reason,UUID(principal.user_id),request.state.request_id,payload.expected_role)
    return execute(operation)


@router.put('/users/{user_id}/status')
def status(user_id:UUID,payload:AccountChange,request:Request,principal=Depends(require_roles(*ADMINS))):
    def operation():
        repo=repository(request)
        if user_id==UUID(principal.user_id): raise OperationDenied
        AuthDirectory(request.app.state.settings).get(user_id)
        return repo.account(user_id,payload,UUID(principal.user_id),request.state.request_id)
    return execute(operation)


@router.get('/attempts')
def attempts(request:Request,page:int=Query(1,ge=1),test_id:UUID|None=None,user_id:UUID|None=None,
             status:str|None=Query(None,pattern='^(in_progress|submitted|expired|terminated)$'),principal=Depends(require_roles(*ADMINS))):
    return execute(lambda:repository(request).attempts(page,test_id,user_id,status,UUID(principal.user_id),request.state.request_id))


@router.post('/attempts/{attempt_id}/terminate')
def terminate(attempt_id:UUID,payload:Reason,request:Request,principal=Depends(require_roles(*ADMINS))):
    return execute(lambda:repository(request).terminate(attempt_id,payload.reason,UUID(principal.user_id),request.state.request_id))


@router.post('/attempts/{attempt_id}/review')
def attempt_review(attempt_id:UUID,payload:Reason,request:Request,principal=Depends(require_roles(*ADMINS))):
    return execute(lambda:repository(request).attempt_detail(attempt_id,payload.reason,UUID(principal.user_id),request.state.request_id))


@router.get('/media')
def media(request:Request,page:int=Query(1,ge=1),archived:bool=False,principal=Depends(require_roles(*AUTHORS))):
    return execute(lambda:repository(request).media(page,archived))


@router.put('/media/{media_id}/archive')
def archive_media(media_id:UUID,payload:ArchiveMedia,request:Request,principal=Depends(require_roles(*AUTHORS))):
    return execute(lambda:repository(request).archive_media(media_id,payload,UUID(principal.user_id),request.state.request_id))


@router.get('/activity')
def activity(request:Request,page:int=Query(1,ge=1),action:str=Query('',max_length=120),entity:str=Query('',max_length=80),
             actor:UUID|None=None,principal=Depends(require_roles('super_administrator'))):
    return execute(lambda:repository(request).activity(page,action,entity,actor))
