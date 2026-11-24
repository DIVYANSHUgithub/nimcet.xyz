import json
from uuid import uuid4

from sqlalchemy import text

from app.db.database import Database
from app.domain.question_content import statement_blocks, statement_text
from app.schemas.content import QuestionWrite


class ContentConflict(Exception):
    pass


class ContentNotFound(Exception):
    pass


# Product vocabulary is an adapter over existing catalog storage. No backfill.
CATALOG = {
    'examinations': ('examinations', None),
    'sections': ('sections', 'examination_id'),
    'subjects': ('subjects', 'examination_id'),
    'topics': ('chapters', 'subject_id'),
    'subtopics': ('topics', 'chapter_id'),
}


def audit(connection, actor, action, entity, request_id):
    connection.execute(text(
        "INSERT INTO public.admin_audit_log(actor_user_id,action_code,entity_type,entity_id,request_id) "
        "VALUES (:actor,:action,'question_content',:entity,:request_id)"
    ), dict(actor=actor, action=action, entity=str(entity), request_id=request_id))


class ContentRepository:
    def __init__(self, database: Database, workflows_enabled: bool=False):
        self.database = database
        self.workflows_enabled = workflows_enabled

    def catalog(self, kind):
        with self.database.read_only_transaction() as c:
            return self._catalog_rows(c, kind)

    def catalog_index(self):
        with self.database.read_only_transaction() as c:
            return {kind: self._catalog_rows(c, kind) for kind in CATALOG}

    @staticmethod
    def _catalog_rows(connection, kind):
        table, parent = CATALOG[kind]
        return [dict(row) for row in connection.execute(text(
            f"SELECT id,code,name,status,{parent if parent else 'NULL::uuid'} AS parent_id "
            f"FROM public.{table} ORDER BY name,id"
        )).mappings()]

    def save_catalog(self, kind, payload, actor, request_id, item_id=None):
        table, parent = CATALOG[kind]
        if bool(parent) != bool(payload.parent_id):
            raise ValueError('This catalog level requires its parent.')
        with self.database.transaction() as c:
            params = dict(id=item_id or uuid4(), code=payload.code, name=payload.name,
                          status=payload.status, parent=payload.parent_id)
            if item_id:
                # Reparenting existing catalog records could invalidate question links.
                sql = (f"UPDATE public.{table} SET code=:code,name=:name,status=:status,updated_at=now() "
                       f"WHERE id=:id" + (f" AND {parent}=:parent" if parent else '') + " RETURNING id")
            else:
                sql = (f"INSERT INTO public.{table}(id,code,name,status" + (f",{parent}" if parent else '')
                       + ") VALUES (:id,:code,:name,:status" + (",:parent" if parent else '') + ") RETURNING id")
            result = c.execute(text(sql), params).scalar_one_or_none()
            if result is None:
                raise ContentNotFound
            audit(c, actor, 'catalog.saved', result, request_id)
            return {'id': str(result)}

    def list_questions(self, page, search, state='', exam='', subject=''):
        with self.database.read_only_transaction() as c:
            rows = c.execute(text(
                "SELECT id,question,status,editorial_state,revision,subject,topic FROM public.questions "
                "WHERE (:search='' OR position(lower(:search) in lower(to_jsonb(question) #>> '{}'))>0) "
                "AND (:state='' OR editorial_state=:state) "
                "AND (:exam='' OR exam=:exam) AND (:subject='' OR subject=:subject) ORDER BY id DESC LIMIT 30 OFFSET :offset"
            ), dict(search=search,state=state,exam=exam,subject=subject, offset=(page - 1)*30)).mappings().all()
            return [dict(r, question=statement_text(r['question'], statement_blocks(r['question']))) for r in rows]

    def get(self, question_id, public=False):
        with self.database.read_only_transaction() as c:
            row = c.execute(text("SELECT * FROM public.questions WHERE id=:id" +
                                 (" AND status='published'" if public else '')),
                            {'id': question_id}).mappings().first()
            if row is None:
                raise ContentNotFound
            result = dict(row)
            result['statement_blocks'] = statement_blocks(result['question'])
            result['question'] = statement_text(result['question'], result['statement_blocks'])
            if result.get('content_document'):
                result['content_document']['occurrences'] = [dict(o) for o in c.execute(text(
                    'SELECT exam,year,section,position,source FROM public.question_occurrences WHERE question_id=:id ORDER BY year,exam,section,position'
                ), {'id':question_id}).mappings().all()]
            return result

    def save(self, question_id, payload: QuestionWrite, actor, request_id):
        doc = payload.document.model_dump(mode='json')
        def plain(blocks):
            return '\n'.join(b.get('text', '') for b in blocks if b['type'] != 'image')
        # Keep legacy fields available for existing readers and test snapshots.
        params = payload.model_dump(exclude={'document', 'expected_revision', 'state'})
        params.update(document=json.dumps({k:v for k,v in doc.items() if k != 'occurrences'}), question=plain(doc['statement']) or '[Illustrated question]',
                      statement=json.dumps(doc['statement']),
                      options=json.dumps([{'id': o['id'], 'text': plain(o['blocks']), 'blocks': o['blocks']} for o in doc['options']]),
                      correct_option=next(i for i,o in enumerate(doc['options']) if o['id']==doc['correct_option_id']),
                      explanation=plain(doc['explanation']), state=payload.state,
                      status='published' if payload.state=='published' else 'draft',
                      actor=actor, id=question_id, expected=payload.expected_revision)
        with self.database.transaction() as c:
            if question_id is not None:
                current = c.execute(text('SELECT content_document,revision FROM public.questions WHERE id=:id FOR UPDATE'),
                                    {'id':question_id}).mappings().first()
                if current is None or current['revision'] != payload.expected_revision:
                    raise ContentConflict
                if current['content_document'] and {o['id'] for o in current['content_document']['options']} != {o['id'] for o in doc['options']}:
                    raise ValueError('Existing option identifiers must be preserved.')
            if payload.subtopic_id:
                valid = c.execute(text(
                    "SELECT 1 FROM public.topics st JOIN public.chapters t ON t.id=st.chapter_id "
                    "JOIN public.subjects s ON s.id=t.subject_id JOIN public.examinations e ON e.id=s.examination_id "
                    "WHERE st.id=:subtopic_id AND s.name=:subject AND :topic IN (t.name,st.name) AND e.code=:exam "
                    "AND st.status='active' AND t.status='active' AND s.status='active' AND e.status='active' FOR SHARE OF st,t,s,e"
                ), params).scalar_one_or_none()
                if valid is None:
                    raise ValueError('Catalog hierarchy does not match the question.')
            if payload.state == 'published':
                section = c.execute(text(
                    'SELECT 1 FROM public.sections s JOIN public.examinations e ON e.id=s.examination_id '
                    "WHERE e.code=:exam AND (s.name=:section OR s.code=:section) AND s.status='active' AND e.status='active' FOR SHARE OF s,e"
                ), params).scalar_one_or_none()
                if section is None:
                    raise ValueError('Choose an active section belonging to this examination.')
            media_ids = {b['media_id'] for blocks in [doc['statement'],doc['explanation'],*[o['blocks'] for o in doc['options']]]
                         for b in blocks if b['type']=='image'}
            for media_id in media_ids:
                if c.execute(text("SELECT 1 FROM public.question_media m WHERE id=:id AND to_jsonb(m)->>'archived_at' IS NULL"+(' FOR SHARE' if self.workflows_enabled else '')), {'id':media_id}).scalar_one_or_none() is None:
                    raise ValueError('Media reference is unavailable.')
            columns = ['exam','exam_year','section','question_number','question','options','correct_option',
                       'explanation','subject','topic','difficulty','source','subtopic_id']
            values = {col: f'CAST(:{col} AS jsonb)' if col=='options' else f':{col}' for col in columns}
            # Match the actual column type on both text and JSONB installations.
            values['question'] = (
                "(jsonb_populate_record(NULL::public.questions, jsonb_build_object('question', "
                "CASE WHEN pg_typeof((NULL::public.questions).question) = 'jsonb'::regtype "
                "THEN CAST(:statement AS jsonb) ELSE to_jsonb(CAST(:question AS text)) END))).question"
            )
            if question_id is None:
                if payload.expected_revision != 0:
                    raise ContentConflict
                sql = ('INSERT INTO public.questions ('+','.join(columns)+',content_document,editorial_state,author_id,status,revision) VALUES ('
                       +','.join(values.values())+',CAST(:document AS jsonb),:state,:actor,:status,1) RETURNING id,revision')
            else:
                sql = ('UPDATE public.questions SET '+','.join(f'{col}={value}' for col,value in values.items())
                       +',content_document=CAST(:document AS jsonb),editorial_state=:state,status=:status,revision=revision+1,updated_at=now() '
                       +'WHERE id=:id AND revision=:expected RETURNING id,revision')
            row = c.execute(text(sql), params).mappings().first()
            if row is None:
                raise ContentConflict
            c.execute(text('DELETE FROM public.question_occurrences WHERE question_id=:id'), {'id':row['id']})
            for occurrence in doc['occurrences']:
                c.execute(text('INSERT INTO public.question_occurrences(question_id,exam,year,section,position,source) '
                               'VALUES (:question_id,:exam,:year,:section,:position,:source)'),
                          {**occurrence,'question_id':row['id']})
            audit(c, actor, 'question.saved', row['id'], request_id)
            return dict(row)
