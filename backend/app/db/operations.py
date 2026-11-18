import json
from uuid import UUID
from sqlalchemy import text

from app.db.content import ContentConflict,ContentNotFound
from app.db.admin import _safe_audit_state
from app.schemas.tests import CreateTestVersion


class OperationDenied(Exception): pass


def audit(c,actor,action,entity,entity_id,reason,request_id,state=None):
    c.execute(text('INSERT INTO public.admin_audit_log(actor_user_id,action_code,entity_type,entity_id,reason,request_id,after_state) '
                   'VALUES(:actor,:action,:entity,:id,:reason,:request,CAST(:state AS jsonb))'),
              dict(actor=actor,action=action,entity=entity,id=str(entity_id),reason=reason,request=request_id,state=json.dumps(state or {},default=str)))


def check_transition(state,action,is_reviewer):
    if action in {'approve','reject'} and not is_reviewer: raise OperationDenied
    expected={'submit':{'draft','rejected'},'withdraw':{'submitted'},'approve':{'submitted'},'reject':{'submitted'}}
    if state not in expected[action]: raise ContentConflict
    return {'submit':'submitted','withdraw':'draft','approve':'approved','reject':'rejected'}[action]


class OperationsRepository:
    def __init__(self,database): self.database=database

    def summary(self):
        with self.database.read_only_transaction() as c:
            return dict(c.execute(text("SELECT (SELECT count(*) FROM public.tests) AS tests,"
                "(SELECT count(*) FROM public.test_versions WHERE status='draft' AND workflow_state='submitted') AS awaiting_review,"
                "(SELECT count(*) FROM public.test_attempts WHERE status='in_progress') AS active_attempts,"
                "(SELECT count(*) FROM public.test_attempts WHERE status='in_progress' AND deadline_at<=now()) AS overdue_attempts,"
                "(SELECT count(*) FROM public.test_results) AS finalized_results,"
                "(SELECT count(*) FROM public.questions WHERE editorial_state='review') AS questions_awaiting_review,"
                "(SELECT count(*) FROM public.tests WHERE status='draft') AS draft_tests,"
                "(SELECT count(*) FROM public.tests WHERE status='published') AS published_tests,"
                "(SELECT count(*) FROM public.test_attempts WHERE status<>'in_progress') AS completed_attempts,"
                "(SELECT count(*) FROM public.pyq_papers p JOIN public.test_versions v ON v.id=p.test_version_id JOIN public.tests t ON t.id=v.test_id WHERE v.status='published' AND t.status='published') AS available_pyq_papers")).mappings().one())

    def version(self,version_id,connection=None):
        def read(c):
            row=c.execute(text('SELECT v.*,t.title,t.kind,t.examination_code,t.created_by AS test_created_by FROM public.test_versions v '
                               'JOIN public.tests t ON t.id=v.test_id WHERE v.id=:id'),{'id':version_id}).mappings().first()
            if row is None: raise ContentNotFound
            sections=c.execute(text('SELECT * FROM public.test_sections WHERE test_version_id=:id ORDER BY display_order,id'),{'id':version_id}).mappings().all()
            config=[]; preview=[]
            for section in sections:
                questions=c.execute(text('SELECT * FROM public.test_questions WHERE test_section_id=:id ORDER BY display_order,id'),{'id':section['id']}).mappings().all()
                config.append({'code':section['code'],'title':section['title'],'display_order':section['display_order'],
                               'questions':[{'question_id':q['question_id'],'display_order':q['display_order'],
                                             'marks':q['marks'] if q['marks'] is not None else section['default_marks'],
                                             'negative_marks':q['negative_marks'] if q['negative_marks'] is not None else section['default_negative_marks']} for q in questions]})
                preview.append({'code':section['code'],'title':section['title'],'questions':[dict(q) for q in questions]})
            configuration={name:row[name] for name in ['duration_seconds','attempt_limit','available_from','available_until','shuffle_questions','shuffle_options','review_policy']}
            configuration['sections']=config
            return {**dict(row),'configuration':configuration,'preview':preview}
        if connection is not None: return read(connection)
        with self.database.read_only_transaction() as c: return read(c)

    def versions(self,test_id):
        with self.database.read_only_transaction() as c:
            return [dict(r) for r in c.execute(text('SELECT id,version_number,status,workflow_state,workflow_revision,created_by,submitted_by,reviewed_by,review_reason '
                'FROM public.test_versions WHERE test_id=:id ORDER BY version_number DESC'),{'id':test_id}).mappings().all()]

    def review_queue(self,page):
        with self.database.read_only_transaction() as c:
            return [dict(r) for r in c.execute(text("SELECT v.id,v.test_id,v.version_number,v.workflow_revision,v.submitted_by,t.title,t.kind "
                "FROM public.test_versions v JOIN public.tests t ON t.id=v.test_id WHERE v.status='draft' AND v.workflow_state='submitted' AND t.status<>'archived' "
                'ORDER BY v.updated_at,v.id LIMIT 30 OFFSET :offset'),{'offset':(page-1)*30}).mappings().all()]

    def transition(self,version_id,payload,actor,reviewer,request_id):
        with self.database.transaction() as c:
            row=c.execute(text('SELECT v.status,v.workflow_state,v.workflow_revision,t.status AS test_status FROM public.test_versions v '
                               'JOIN public.tests t ON t.id=v.test_id WHERE v.id=:id FOR UPDATE OF v,t'),{'id':version_id}).mappings().first()
            if row is None: raise ContentNotFound
            if row['status']!='draft' or row['test_status']=='archived' or row['workflow_revision']!=payload.expected_revision: raise ContentConflict
            state=check_transition(row['workflow_state'],payload.action,reviewer)
            if payload.action in {'submit','approve'}:
                detail=self.version(version_id,c)
                CreateTestVersion.model_validate(detail['configuration'])
                if any(len(p['questions'])==0 for p in detail['preview']): raise ValueError('Empty section.')
            field='submitted_by' if payload.action=='submit' else 'reviewed_by' if payload.action in {'approve','reject'} else None
            result=c.execute(text('UPDATE public.test_versions SET workflow_state=:state,workflow_revision=workflow_revision+1,review_reason=:reason,updated_at=now()'
                                  +(f',{field}=:actor' if field else '')+' WHERE id=:id RETURNING workflow_state,workflow_revision'),
                             dict(state=state,reason=payload.reason,actor=actor,id=version_id)).mappings().one()
            audit(c,actor,'test.'+payload.action,'test_version',version_id,payload.reason,request_id,dict(result))
            return dict(result)

    def metadata(self,test_id,title,reason,actor,request_id):
        with self.database.transaction() as c:
            row=c.execute(text('UPDATE public.tests SET title=:title,updated_at=now() WHERE id=:id RETURNING id'),{'id':test_id,'title':title}).first()
            if row is None: raise ContentNotFound
            audit(c,actor,'test.renamed','test',test_id,reason,request_id)
            return {'id':test_id,'title':title}

    def availability(self,test_id,payload,actor,request_id):
        with self.database.transaction() as c:
            row=c.execute(text('SELECT status FROM public.tests WHERE id=:id FOR UPDATE'),{'id':test_id}).mappings().first()
            if row is None: raise ContentNotFound
            if row['status']=='archived': raise ContentConflict
            if payload.available and not c.execute(text("SELECT EXISTS(SELECT 1 FROM public.test_versions WHERE test_id=:id AND status='published')"),{'id':test_id}).scalar_one():
                raise ValueError('Publish an approved version before resuming availability.')
            state='published' if payload.available else 'draft'
            c.execute(text('UPDATE public.tests SET status=:status,updated_at=now() WHERE id=:id'),{'id':test_id,'status':state})
            audit(c,actor,'test.resumed' if payload.available else 'test.suspended','test',test_id,payload.reason,request_id,{'status':state})
            return {'id':test_id,'status':state}

    def archive_test(self,test_id,reason,actor,request_id):
        with self.database.transaction() as c:
            row=c.execute(text("UPDATE public.tests SET status='archived',updated_at=now() WHERE id=:id RETURNING id"),{'id':test_id}).first()
            if row is None: raise ContentNotFound
            audit(c,actor,'test.archived','test',test_id,reason,request_id)
            return {'id':test_id,'status':'archived'}

    def user_states(self,user_ids):
        result={str(uid):{'roles':[],'status':'active','suspended_until':None} for uid in user_ids}
        with self.database.read_only_transaction() as c:
            for row in c.execute(text('SELECT ur.user_id,r.code FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id '
                                     'WHERE ur.revoked_at IS NULL AND ur.user_id=ANY(CAST(:ids AS uuid[]))'),{'ids':list(user_ids)}).mappings().all():
                result[str(row['user_id'])]['roles'].append(row['code'])
            for row in c.execute(text('SELECT user_id,status,suspended_until FROM public.account_status WHERE user_id=ANY(CAST(:ids AS uuid[])) '
                                     "AND status='suspended' AND(suspended_until IS NULL OR suspended_until>now())"),{'ids':list(user_ids)}).mappings().all():
                result[str(row['user_id'])].update(status=row['status'],suspended_until=row['suspended_until'])
        return result

    def replace_role(self,user_id,role,reason,actor,request_id,expected_role=None):
        if user_id==actor: raise OperationDenied
        with self.database.transaction() as c:
            c.execute(text('SELECT pg_advisory_xact_lock(384710992641)'))
            old=c.execute(text('SELECT r.code,ur.assignment_id FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id '
                               'WHERE ur.user_id=:id AND ur.revoked_at IS NULL FOR UPDATE OF ur'),{'id':user_id}).mappings().all()
            if len(old)>1 or (old[0]['code'] if old else None)!=expected_role: raise ContentConflict
            if old and old[0]['code']==role: return {'role':role,'unchanged':True}
            if old and old[0]['code']=='super_administrator':
                count=c.execute(text("SELECT count(*) FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id WHERE r.code='super_administrator' AND ur.revoked_at IS NULL")).scalar_one()
                if count<=1: raise OperationDenied
            if role in {'administrator','super_administrator'}:
                suspended=c.execute(text("SELECT 1 FROM public.account_status WHERE user_id=:id AND status='suspended' AND(suspended_until IS NULL OR suspended_until>now())"),{'id':user_id}).scalar_one_or_none()
                if suspended is not None: raise ValueError('Restore application access before granting a privileged role.')
            role_id=c.execute(text('SELECT id FROM public.roles WHERE code=:role'),{'role':role}).scalar_one_or_none()
            if role_id is None: raise ValueError('Unknown role.')
            c.execute(text('UPDATE public.user_roles SET revoked_at=now(),revocation_reason=:reason WHERE user_id=:id AND revoked_at IS NULL'),{'id':user_id,'reason':reason})
            c.execute(text('INSERT INTO public.user_roles(user_id,role_id,granted_by,grant_reason) VALUES(:id,:role,:actor,:reason)'),dict(id=user_id,role=role_id,actor=actor,reason=reason))
            audit(c,actor,'role.replaced','user',user_id,reason,request_id,{'role_code':role})
            return {'role':role,'unchanged':False}

    def account(self,user_id,payload,actor,request_id):
        if user_id==actor: raise OperationDenied
        with self.database.transaction() as c:
            c.execute(text('SELECT pg_advisory_xact_lock(384710992641)'))
            privileged=c.execute(text("SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id WHERE ur.user_id=:id AND ur.revoked_at IS NULL "
                                      "AND r.code IN ('administrator','super_administrator')"),{'id':user_id}).scalar_one_or_none()
            # Keep privileged account access outside the ordinary student-support
            # suspension workflow; this also protects the last active owner.
            if privileged is not None: raise OperationDenied
            c.execute(text('INSERT INTO public.account_status(user_id,status,suspended_until,reason,changed_by) VALUES(:id,:status,:until,:reason,:actor) '
                           'ON CONFLICT(user_id) DO UPDATE SET status=EXCLUDED.status,suspended_until=EXCLUDED.suspended_until,reason=EXCLUDED.reason,changed_by=EXCLUDED.changed_by,updated_at=now()'),
                      dict(id=user_id,status=payload.status,until=payload.suspended_until if payload.status=='suspended' else None,reason=payload.reason,actor=actor))
            audit(c,actor,'account.'+payload.status,'user',user_id,payload.reason,request_id,{'status':payload.status})
            return {'status':payload.status}

    def attempts(self,page,test_id=None,user_id=None,status=None,actor=None,request_id=None):
        clauses=['true']; params={'offset':(page-1)*30}
        for name,column,value in [('test','t.id',test_id),('user','a.user_id',user_id),('status','a.status',status)]:
            if value is not None: clauses.append(f'{column}=:{name}'); params[name]=value
        with self.database.transaction() as c:
            rows=[dict(r) for r in c.execute(text('SELECT a.id,a.user_id,a.test_version_id,a.status,a.started_at,a.deadline_at,a.submitted_at,'
                't.title,r.score,r.maximum_score,r.correct_count,r.incorrect_count,r.unanswered_count '
                'FROM public.test_attempts a JOIN public.test_versions v ON v.id=a.test_version_id JOIN public.tests t ON t.id=v.test_id '
                'LEFT JOIN public.test_results r ON r.attempt_id=a.id WHERE '+' AND '.join(clauses)+' ORDER BY a.started_at DESC,a.id LIMIT 30 OFFSET :offset'),params).mappings().all()]
            audit(c,actor,'attempt.monitoring_viewed','attempt_directory','page:'+str(page),'Administrative attempt monitoring',request_id)
            return rows

    def attempt_detail(self,attempt_id,reason,actor,request_id):
        # Reading a student's saved answers requires an explicit audited action.
        # Active attempts never expose their answer key through this endpoint.
        with self.database.transaction() as c:
            row=c.execute(text('SELECT a.*,t.title FROM public.test_attempts a JOIN public.test_versions v ON v.id=a.test_version_id '
                               'JOIN public.tests t ON t.id=v.test_id WHERE a.id=:id FOR SHARE OF a'),{'id':attempt_id}).mappings().first()
            if row is None: raise ContentNotFound
            if row['status']=='in_progress': raise OperationDenied
            result=c.execute(text('SELECT * FROM public.test_results WHERE attempt_id=:id'),{'id':attempt_id}).mappings().first()
            sections=c.execute(text('SELECT sr.*,s.title FROM public.section_results sr JOIN public.test_sections s ON s.id=sr.test_section_id '
                                    'WHERE sr.attempt_id=:id ORDER BY s.display_order'),{'id':attempt_id}).mappings().all()
            answers=c.execute(text('SELECT q.*,aq.display_order AS attempt_order,aq.option_order,aa.selected_option_id,s.title AS section_title '
                                   'FROM public.attempt_questions aq JOIN public.test_questions q ON q.id=aq.test_question_id '
                                   'JOIN public.test_sections s ON s.id=q.test_section_id LEFT JOIN public.attempt_answers aa ON aa.attempt_question_id=aq.id '
                                   'WHERE aq.attempt_id=:id ORDER BY aq.display_order'),{'id':attempt_id}).mappings().all()
            audit(c,actor,'attempt.reviewed','attempt',attempt_id,reason,request_id)
            return {'attempt':dict(row),'result':dict(result) if result else None,'sections':[dict(s) for s in sections],'questions':[dict(q) for q in answers]}

    def terminate(self,attempt_id,reason,actor,request_id):
        with self.database.transaction() as c:
            row=c.execute(text('SELECT status,deadline_at,clock_timestamp() AS now FROM public.test_attempts WHERE id=:id FOR UPDATE'),{'id':attempt_id}).mappings().first()
            if row is None: raise ContentNotFound
            if row['status']!='in_progress' or row['deadline_at']<=row['now']: raise ContentConflict
            c.execute(text("UPDATE public.test_attempts SET status='terminated',submitted_at=clock_timestamp(),submission_reason='admin_terminated',updated_at=clock_timestamp() WHERE id=:id"),{'id':attempt_id})
            audit(c,actor,'attempt.terminated','attempt',attempt_id,reason,request_id)
            return {'status':'terminated'}

    def media(self,page,archived=False):
        with self.database.read_only_transaction() as c:
            return [dict(r) for r in c.execute(text('SELECT id,content_type,byte_size,created_at,archived_at FROM public.question_media '
                +('WHERE archived_at IS NOT NULL ' if archived else 'WHERE archived_at IS NULL ')
                +'ORDER BY created_at DESC,id LIMIT 30 OFFSET :offset'),{'offset':(page-1)*30}).mappings().all()]

    def archive_media(self,media_id,payload,actor,request_id):
        with self.database.transaction() as c:
            row=c.execute(text('SELECT id FROM public.question_media WHERE id=:id FOR UPDATE'),{'id':media_id}).first()
            if row is None: raise ContentNotFound
            if payload.archived:
                used=c.execute(text("SELECT EXISTS(SELECT 1 FROM public.questions "
                                    "WHERE position(:id in COALESCE(content_document::text,''))>0 "
                                    "OR position(:id in to_jsonb(question)::text)>0 OR position(:id in options::text)>0) "
                                    "OR EXISTS(SELECT 1 FROM public.test_questions q WHERE position(:id in to_jsonb(q)::text)>0)"),{'id':str(media_id)}).scalar_one()
                if used: raise ContentConflict
            c.execute(text('UPDATE public.question_media SET archived_at='+('now(),archived_by=:actor' if payload.archived else 'NULL,archived_by=NULL')+' WHERE id=:id'),{'id':media_id,'actor':actor})
            audit(c,actor,'media.archived' if payload.archived else 'media.restored','media',media_id,payload.reason,request_id,{'archived':payload.archived})
            return {'id':media_id,'archived':payload.archived}

    def activity(self,page,action,entity,actor):
        clauses=['true']; params={'offset':(page-1)*30}
        for key,column,value in [('action','action_code',action),('entity','entity_type',entity),('actor','actor_user_id',actor)]:
            if value: clauses.append(f'{column}=:{key}'); params[key]=value
        with self.database.read_only_transaction() as c:
            rows=c.execute(text('SELECT id,actor_user_id,action_code,entity_type,entity_id,reason,request_id,created_at,before_state,after_state '
                                'FROM public.admin_audit_log WHERE '+' AND '.join(clauses)+' ORDER BY created_at DESC,id DESC LIMIT 30 OFFSET :offset'),params).mappings().all()
        return [{**dict(r),'before_state':_safe_audit_state(r['before_state']),'after_state':_safe_audit_state(r['after_state'])} for r in rows]
