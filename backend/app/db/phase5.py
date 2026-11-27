import json
import hashlib
from uuid import UUID
from decimal import Decimal

from sqlalchemy import text

from app.db.content import ContentNotFound, audit
from app.db.test_engine import _result_release_time
from app.domain.results import result_metrics


PAPER_QUESTIONS_SQL = (
    'SELECT q.id,q.question_id,s.code,s.title,s.display_order AS section_order,q.display_order AS question_order,'
    "(to_jsonb(s)->>'duration_seconds')::integer AS section_duration_seconds,"
    'q.question_snapshot,q.options_snapshot,q.correct_option_snapshot,q.explanation_snapshot,'
    "(to_jsonb(q)->>'alternate_correct_option_snapshot')::integer AS alternate_correct_option_snapshot,"
    "NULLIF((to_jsonb(q)->>'automatic_full_credit')::boolean, false) AS automatic_full_credit,"
    "to_jsonb(q)->'question_blocks_snapshot' AS question_blocks_snapshot,"
    "to_jsonb(q)->'explanation_blocks_snapshot' AS explanation_blocks_snapshot,"
    'COALESCE(q.marks,s.default_marks) AS marks,COALESCE(q.negative_marks,s.default_negative_marks) AS negative_marks '
    'FROM public.test_sections s JOIN public.test_questions q ON q.test_section_id=s.id '
    'WHERE s.test_version_id=:id ORDER BY s.display_order,q.display_order'
)

PUBLIC_PAPER_CONDITION = (
    "t.kind='pyq' AND t.visibility='public' AND t.status='published' AND v.status='published'"
)


def paper_snapshot_digest(version, rows):
    configuration = {key:version[key] for key in ['examination_code','duration_seconds','shuffle_questions','shuffle_options']}
    optional_keys = {'section_duration_seconds', 'alternate_correct_option_snapshot', 'automatic_full_credit'}
    questions = [{key: value for key, value in row.items()
                  if key not in optional_keys or value is not None} for row in rows]
    serialized=json.dumps({'configuration':configuration,'questions':questions},sort_keys=True,default=str,separators=(',',':'))
    return hashlib.sha256(serialized.encode('utf-8')).hexdigest()


def validate_paper_version(version, rows, approval):
    paper=approval.paper
    if version['kind']!='pyq' or version['status']!='draft' or version['test_status']=='archived':
        raise ValueError('Only a draft PYQ version may be approved.')
    if version['examination_code']!=paper.examination_code or version['duration_seconds']!=paper.duration_seconds:
        raise ValueError('Examination and duration must match the verified source.')
    if version['shuffle_questions'] or version['shuffle_options']:
        raise ValueError('Official paper ordering cannot be shuffled.')
    groups={}
    for row in rows:
        groups.setdefault(row['code'],[]).append(row)
        if row['correct_option_snapshot'] not in range(4) or not isinstance(row['options_snapshot'],list) or len(row['options_snapshot'])!=4 or not row['question_snapshot'].strip():
            raise ValueError('A question snapshot is incomplete.')
    if list(groups)!=[s.code for s in approval.sections]:
        raise ValueError('The section order must match the verified blueprint.')
    for index,spec in enumerate(approval.sections):
        questions=groups[spec.code]
        if len(questions)!=spec.question_count or questions[0]['section_order']!=index:
            raise ValueError('The section count or original order is incomplete.')
        if [q['question_order'] for q in questions]!=list(range(spec.question_count)):
            raise ValueError('Question positions must be complete and contiguous.')
        if questions[0].get('section_duration_seconds') != spec.duration_seconds:
            raise ValueError('The section duration differs from the verified source.')
        start = 0
        for group in spec.marking_groups or [spec]:
            end = start + group.question_count
            if any(Decimal(str(q['marks'])) != group.marks or Decimal(str(q['negative_marks'])) != group.negative_marks
                   for q in questions[start:end]):
                raise ValueError('The marking scheme differs from the verified source.')
            start = end


class Phase5Repository:
    def __init__(self,database,workflows_enabled=False): self.database=database; self.workflows_enabled=workflows_enabled

    def approve_paper(self,version_id,approval,actor,request_id):
        with self.database.transaction() as c:
            version=c.execute(text(
                'SELECT v.id,v.status,v.duration_seconds,v.shuffle_questions,v.shuffle_options,'
                "t.kind,t.status AS test_status,t.examination_code,t.visibility,to_jsonb(v)->>'workflow_state' AS workflow_state FROM public.test_versions v "
                'JOIN public.tests t ON t.id=v.test_id WHERE v.id=:id FOR UPDATE OF v,t'
            ),{'id':version_id}).mappings().first()
            if version is None: raise ContentNotFound
            if version['visibility'] != 'public': raise ValueError('The paper must have public visibility.')
            rows=c.execute(text(PAPER_QUESTIONS_SQL),{'id':version_id}).mappings().all()
            if self.workflows_enabled and version['workflow_state']!='approved': raise ValueError('Complete test review first.')
            validate_paper_version(version,rows,approval)
            c.execute(text(
                'INSERT INTO public.pyq_papers(test_version_id,examination_code,year,title,metadata,snapshot_digest,approved_by) '
                'VALUES(:id,:exam,:year,:title,CAST(:metadata AS jsonb),:digest,:actor) ON CONFLICT(test_version_id) DO UPDATE '
                'SET examination_code=EXCLUDED.examination_code,year=EXCLUDED.year,title=EXCLUDED.title,'
                'metadata=EXCLUDED.metadata,snapshot_digest=EXCLUDED.snapshot_digest,approved_by=EXCLUDED.approved_by,approved_at=now()'
            ),dict(id=version_id,exam=approval.paper.examination_code,year=approval.paper.year,
                   title=approval.paper.original_title,metadata=json.dumps(approval.model_dump(mode='json')),digest=paper_snapshot_digest(version,rows),actor=actor))
            audit(c,actor,'pyq.approved',version_id,request_id)
        return {'test_version_id':str(version_id),'approved':True,'question_count':len(rows)}

    def candidates(self):
        with self.database.read_only_transaction() as c:
            return [dict(r) for r in c.execute(text(
                "SELECT v.id AS test_version_id,t.id AS test_id,t.title,t.examination_code,v.duration_seconds,v.version_number, "
                "p.metadata AS approval, (NOT :workflows_enabled OR to_jsonb(v)->>'workflow_state'='approved') AS ready_for_verification "
                "FROM public.test_versions v JOIN public.tests t ON t.id=v.test_id "
                "LEFT JOIN public.pyq_papers p ON p.test_version_id=v.id "
                "WHERE t.kind='pyq' AND t.visibility='public' AND v.status='draft' AND t.status<>'archived' "
                'ORDER BY t.created_at DESC,v.version_number DESC LIMIT 100'
            ), {'workflows_enabled': self.workflows_enabled}).mappings().all()]

    def papers(self, exam, year, page, page_size, user_id=None):
        filters = (PUBLIC_PAPER_CONDITION +
                   " AND v.version_number=(SELECT max(v2.version_number) FROM public.test_versions v2 "
                   "WHERE v2.test_id=t.id AND v2.status='published')")
        params = {'user': UUID(user_id) if user_id else None, 'exam': exam, 'year': year, 'limit': page_size}
        if exam: filters+=' AND p.examination_code=:exam'
        if year: filters+=' AND p.year=:year'
        base=' FROM public.pyq_papers p JOIN public.test_versions v ON v.id=p.test_version_id JOIN public.tests t ON t.id=v.test_id WHERE '+filters
        with self.database.read_only_transaction() as c:
            total=c.execute(text('SELECT count(*)'+base),params).scalar_one()
            page = min(page, max(1, (total + page_size - 1) // page_size))
            rows=c.execute(text(
                'SELECT p.test_version_id,t.id AS test_id,p.examination_code,p.year,p.title,p.metadata,v.duration_seconds,'
                'v.available_from,v.available_until,v.attempt_limit,'
                '(SELECT count(*) FROM public.test_attempts a WHERE a.test_version_id=v.id AND a.user_id=:user) AS attempts_used,'
                "(SELECT a.id FROM public.test_attempts a WHERE a.test_version_id=v.id AND a.user_id=:user "
                "AND a.status='in_progress' ORDER BY a.started_at DESC LIMIT 1) AS active_attempt_id"
                +base+' ORDER BY p.year DESC,p.examination_code,p.title,p.test_version_id LIMIT :limit OFFSET :offset'
            ), dict(params, offset=(page - 1) * page_size)).mappings().all()
        # List the latest published version per test; starts are pinned to its ID.
        return {'items':[dict(r) for r in rows],'total':total,'page':page,'page_size':page_size,'has_more':page*page_size<total}

    def performance(self,user_id):
        with self.database.read_only_transaction() as c:
            rows=c.execute(text(
                'SELECT a.id,a.status,a.submitted_at,v.review_policy,r.correct_count,r.incorrect_count,r.unanswered_count,'
                'r.score,r.maximum_score,clock_timestamp() AS server_time '
                'FROM public.test_attempts a JOIN public.test_versions v ON v.id=a.test_version_id '
                'JOIN public.test_results r ON r.attempt_id=a.id WHERE a.user_id=:user ORDER BY a.submitted_at,a.id'
            ),{'user':UUID(user_id)}).mappings().all()
            sections=c.execute(text(
                'SELECT a.status,a.submitted_at,v.review_policy,sr.score,sr.maximum_score,sr.correct_count,sr.incorrect_count,'
                'sr.unanswered_count,s.code,s.title,clock_timestamp() AS server_time FROM public.section_results sr '
                'JOIN public.test_attempts a ON a.id=sr.attempt_id JOIN public.test_versions v ON v.id=a.test_version_id '
                'JOIN public.test_sections s ON s.id=sr.test_section_id WHERE a.user_id=:user'
            ),{'user':UUID(user_id)}).mappings().all()
        def released(row):
            return row['status'] in {'submitted','expired'} and _result_release_time(row['review_policy'],row['submitted_at'],row['server_time']) is not None
        visible=[r for r in rows if released(r)]
        grouped={}
        for r in sections:
            if not released(r): continue
            key=(r['code'],r['title'])
            group=grouped.setdefault(key,dict(code=r['code'],title=r['title'],score=Decimal(0),maximum_score=Decimal(0),correct_count=0,incorrect_count=0,unanswered_count=0))
            for name in ['score','maximum_score','correct_count','incorrect_count','unanswered_count']: group[name]+=r[name]
        totals={name:sum(r[name] for r in visible) for name in ['correct_count','incorrect_count','unanswered_count']}
        return {**totals,**result_metrics(*totals.values()),'released_attempts':len(visible),
                'sections':[{**g,**result_metrics(g['correct_count'],g['incorrect_count'],g['unanswered_count'])} for g in grouped.values()],
                'recent':[{ 'attempt_id':str(r['id']),'submitted_at':r['submitted_at'],'score':r['score'],'maximum_score':r['maximum_score'],
                          **result_metrics(r['correct_count'],r['incorrect_count'],r['unanswered_count'])} for r in visible[-20:]]}
