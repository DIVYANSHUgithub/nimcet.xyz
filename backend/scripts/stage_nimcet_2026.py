"""Stage the reviewed NIMCET 2026 paper as a draft on an explicitly selected project."""

import argparse
import json
import re
import sys
from contextlib import contextmanager
from hashlib import sha256
from pathlib import Path
from uuid import UUID

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings
from app.db.database import Database
from app.db.operations import OperationsRepository
from app.db.phase5 import Phase5Repository
from app.db.test_authoring import TestAuthoringRepository
from app.schemas.operations import ReviewChange
from app.schemas.pyq import PYQApprovalRequest
from assemble_nimcet_2026 import BROCHURE, TITLE, assemble

REPORT = 'https://cdnbbsr.s3waas.gov.in/s33e6260b81898beacda3d16db379ed329/uploads/2026/06/202606181590062828.pdf'
CORRECTIONS = {311120391: [3, 0], 311120413: [3], 311120467: [1]}
MARKER = 'nimcet-2026-pyq-reviewed-draft'
KEY_NOTES = {
    311120362: 'Modulo 3, the relation is equivalent to a + b being divisible by 3, so it is symmetric. '
               'It is not reflexive (1 is not related to itself) or transitive (1 is related to 2 and 2 to 1, but 1 is not related to itself).',
    311120363: 'The two even inputs have 4 × 3 choices among even outputs. The other inputs have '
               '6 × 5 choices among the remaining outputs. Thus n = 360 = 2³ × 3² × 5 and a + b + c = 6.',
    311120413: 'The official post-challenge model solution awards credit for option 4, Neither I nor II follows.',
}
CHAPTERS = {
    'Mathematics': {
        'Set Theory and Logic': 'Set Theory|Mathematical Logic|Functions|Relations|Relations and Functions',
        'Algebra': 'Algebra|Arithmetic Progressions and Quadratic Equations|Binomial Theorem|Determinants|Exponents and Logarithms|Matrices and Determinants|Quadratic Equations|Sequences and Series|Simultaneous Equations',
        'Coordinate Geometry': 'Conic Sections|Coordinate Geometry',
        'Calculus': 'Differentiability|Differential Calculus|Integral Calculus|Limits',
        'Probability and Statistics': 'Probability|Statistics',
        'Trigonometry': 'Inverse Trigonometric Functions|Trigonometry',
    },
    'Analytical Ability & Logical Reasoning': {
        'Numerical Reasoning': 'Arithmetic Reasoning|Averages|Averages and Arithmetic Reasoning|Mensuration - Volumes of Solids|Number Patterns - Iterative Updates|Number Puzzles - Missing Number in a Table|Number Series|Number Series - Arithmetic Progression|Percentage|Percentages - Algebraic Word Problem|Percentages - Price and Consumption|Problems on Ages|Ratio and Mixture|Ratio and Proportion|Sets and Percentages|Simple Interest - Inverse Proportion|Time and Clock',
        'Puzzles and Arrangements': 'Circular Seating Arrangement - Assignment Puzzle|Grouping and Team Formation|Ordering and Arrangement - Stacking|Ranking and Order|Seating Arrangement',
        'Logical and Verbal Reasoning': 'Blood Relations|Blood Relations - Family Relationships|Blood Relations - Family Tree|Coding-Decoding|Course of Action|Direction Sense - Turning and Orientation|Logical Arguments|Logical Deduction - Syllogism|Logical Reasoning|Logical Reasoning - Valid Conclusions|Non-Verbal Reasoning|Reading Comprehension|Syllogism',
        'Data Interpretation': 'Data Interpretation|Data Interpretation - Comparing Nutritional Composition|Logical Reasoning and Data Interpretation',
    },
    'Computer Awareness': {
        'Computer Basics and Hardware': 'CPU Architecture and Instruction Cycle|Computer Architecture and Instruction Formats|Computer Architecture and Machine Instructions|Computer Fundamentals and Storage Devices|Computer Memory Hierarchy|Computer Memory and Storage',
        'Data Representation': "Binary Arithmetic|Boolean Algebra and Logic Gates|Number Systems and Data Representation|Number Systems and Number Representation|Number Systems and Two's Complement",
        'Computer Software': 'Operating Systems and Dynamic Linking|Operating Systems and Virtual Memory|System Software and Application Software',
        'Internet and Email': 'Computer Networks and DNS|Computer Networks and Email Protocols|Email Protocols|Web Browsers and Cookies|Web Browsers and Web Technologies|Web Technologies and Internet Protocols',
    },
    'General English': {
        'Grammar': 'Subject-Verb Agreement|Tenses and Sequence of Events|Types of Phrases',
        'Vocabulary and Usage': 'Phrasal Verbs|Verb-Noun Collocations|Vocabulary|Vocabulary and Word Usage',
        'Reading Comprehension': 'Reading Comprehension',
    },
}
TOPIC_GROUPS = {(subject, topic): chapter for subject, chapters in CHAPTERS.items()
                for chapter, names in chapters.items() for topic in names.split('|')}


class Transaction:
    def __init__(self, connection):
        self.connection = connection

    @contextmanager
    def transaction(self):
        yield self.connection


def catalog_id(connection, table, name, *, parent_column=None, parent=None):
    # Callers use only the four fixed catalog table/parent combinations below.
    prefix = re.sub(r'[^A-Z0-9]+', '_', name.upper()).strip('_')[:60]
    code = 'NIMCET' if table == 'examinations' else f'{prefix}_{sha256(name.encode()).hexdigest()[:8]}'
    scope = f', {parent_column}' if parent_column else ''
    parent_value = ', :parent' if parent_column else ''
    return connection.execute(text(
        f'INSERT INTO public.{table}(code,name{scope}) VALUES (:code,:name{parent_value}) '
        f'ON CONFLICT ({parent_column + ", " if parent_column else ""}code) DO NOTHING RETURNING id'
    ), {'code': code, 'name': name, 'parent': parent}).scalar_one_or_none() or connection.execute(text(
        f'SELECT id FROM public.{table} WHERE code=:code'
        + (f' AND {parent_column}=:parent' if parent_column else '')
    ), {'code': code, 'parent': parent}).scalar_one()


def add_occurrences(connection, records):
    exam = catalog_id(connection, 'examinations', 'NIMCET')
    for label in CHAPTERS:
        catalog_id(connection, 'sections', label, parent_column='examination_id', parent=exam)
    subjects, chapters, topics = {}, {}, {}
    for row in records:
        subject, topic = row['subject'], row['topic']
        chapter = TOPIC_GROUPS[subject, topic]
        if subject not in subjects:
            subjects[subject] = catalog_id(connection, 'subjects', subject, parent_column='examination_id', parent=exam)
        chapter_key = (subject, chapter)
        if chapter_key not in chapters:
            chapters[chapter_key] = catalog_id(connection, 'chapters', chapter, parent_column='subject_id', parent=subjects[subject])
        if (subject, topic) not in topics:
            topics[subject, topic] = catalog_id(connection, 'topics', topic, parent_column='chapter_id', parent=chapters[chapter_key])
        assignment = topics[subject, topic]
        assigned = connection.execute(text(
            'UPDATE public.questions SET subtopic_id=:topic WHERE id=:id AND (subtopic_id IS NULL OR subtopic_id=:topic) RETURNING id'
        ), {'id': row['id'], 'topic': assignment}).scalar_one_or_none()
        if assigned is None:
            raise ValueError('A question already uses a different taxonomy assignment.')
        params = {'question_id': row['id'], 'section': row['section'], 'position': row['question_number'], 'source': row['source']}
        connection.execute(text(
            "INSERT INTO public.question_occurrences(question_id,exam,year,section,position,source) "
            "VALUES (:question_id,'NIMCET',2026,:section,:position,:source) ON CONFLICT DO NOTHING"
        ), params)
        mapped = connection.execute(text(
            "SELECT question_id FROM public.question_occurrences WHERE exam='NIMCET' AND year=2026 AND section=:section AND position=:position"
        ), params).scalar_one()
        if mapped != row['id']:
            raise ValueError('An original exam position already points at a different question.')
    return len(chapters), len(topics)


def stage(connection, snapshot, key, actor):
    connection.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:marker,0))"), {'marker': MARKER})
    if actor is None:
        actor = connection.execute(text(
            "SELECT ur.user_id FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id "
            "WHERE ur.revoked_at IS NULL AND r.code='super_administrator'"
        )).scalar_one()
    elif not connection.execute(text(
        "SELECT EXISTS(SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id=ur.role_id "
        "WHERE ur.revoked_at IS NULL AND ur.user_id=:id AND r.code IN ('administrator','super_administrator'))"
    ), {'id': actor}).scalar_one():
        raise ValueError('The selected actor must be an active administrator.')
    current = [dict(row) for row in connection.execute(text(
        "SELECT id,exam,exam_year,section,subject,question_number,question,options,correct_option,explanation,topic,source,status "
        "FROM public.questions WHERE exam='NIMCET' AND exam_year=2026 AND status='published' ORDER BY id FOR SHARE"
    )).mappings()]
    original = {q['id']: q for q in snapshot}
    for row in current:
        if any(row[field] != original.get(row['id'], {}).get(field) for field in ('question', 'options', 'section', 'question_number')):
            raise ValueError('A hosted question statement, option order, or position changed since source review.')
    official_ids = {row['official_id'] for row in key}
    if official_ids != set(range(311120361, 311120481)) or any(
        row['accepted_indexes'] != CORRECTIONS.get(row['official_id'], [row['original_index']]) for row in key
    ):
        raise ValueError('The reviewed key does not include the official corrections.')
    draft, version, sections = assemble(current, key)
    by_question = {row['id']: row for row in key}
    for part in version.sections:
        for question in part.questions:
            item = by_question[question.question_id]
            official_id = item['official_id']
            if official_id == 311120391:
                question.explanation_override = (original[question.question_id]['explanation'] or '') + (
                    '\n\nThe official post-challenge solution accepts both option 1 and option 4 for full marks.'
                )
            elif official_id in KEY_NOTES:
                question.explanation_override = KEY_NOTES[official_id]
    existing = connection.execute(text(
        "SELECT t.id,v.id AS version_id FROM public.tests t JOIN public.test_versions v ON v.test_id=t.id "
        "JOIN public.admin_audit_log audit ON audit.entity_id=t.id::text "
        "WHERE audit.request_id=:marker AND audit.action_code='test.created'"
    ), {'marker': MARKER}).mappings().one_or_none()
    if existing:
        return {'created': False, 'test_id': str(existing['id']), 'version_id': str(existing['version_id'])}
    if connection.execute(text("SELECT EXISTS(SELECT 1 FROM public.tests WHERE kind='pyq' AND title=:title)"),
                          {'title': TITLE}).scalar_one():
        raise ValueError('A different draft with this title already exists.')
    chapter_count, topic_count = add_occurrences(connection, current)
    transaction = Transaction(connection)
    authoring = TestAuthoringRepository(transaction, phase5_enabled=True, workflows_enabled=True)
    test = authoring.create_draft(draft=draft, actor_id=str(actor), request_id=MARKER)
    record = authoring.create_version(test_id=test['id'], version=version, actor_id=str(actor), request_id=MARKER)
    version_id = UUID(record['id'])
    for revision, action in enumerate(('submit', 'approve')):
        OperationsRepository(transaction).transition(version_id,
            ReviewChange(action=action, expected_revision=revision, reason='Reviewed against source paper and official corrections'),
            actor, True, MARKER)
    approval = PYQApprovalRequest(paper=dict(examination_code='NIMCET', year=2026, original_title=TITLE,
        duration_seconds=7200, source_url=BROCHURE, source_citation=f'Original response sheet and official challenges report: {REPORT}',
        source_verification='verified', answer_key_verification='verified'), sections=sections)
    Phase5Repository(transaction, workflows_enabled=True).approve_paper(version_id, approval, actor, MARKER)
    checks = connection.execute(text(
        "SELECT s.duration_seconds,count(q.id) AS questions,sum(q.marks) AS marks,"
        "count(q.alternate_correct_option_snapshot) AS alternatives "
        "FROM public.test_sections s JOIN public.test_questions q ON q.test_section_id=s.id "
        "WHERE s.test_version_id=:id GROUP BY s.id ORDER BY s.display_order"
    ), {'id': version_id}).all()
    if [tuple(row) for row in checks] != [(4200, 50, 600, 1), (1800, 40, 240, 0), (1200, 30, 160, 0)]:
        raise ValueError('The staged snapshots do not match the reviewed scoring and timing blueprint.')
    return {'created': True, 'test_id': test['id'], 'version_id': str(version_id), 'status': 'draft',
            'questions': record['question_count'], 'verified_chapters': chapter_count, 'verified_topics': topic_count}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-ref', required=True)
    parser.add_argument('--snapshot', required=True, type=Path)
    parser.add_argument('--key', required=True, type=Path)
    parser.add_argument('--actor', type=UUID)
    args = parser.parse_args()
    settings = Settings()
    if settings.supabase_url != f'https://{args.project_ref}.supabase.co':
        raise ValueError('The configured Supabase URL does not match the approved target.')
    db = Database(settings.database_url.get_secret_value(), **settings.database_options())
    try:
        with db.transaction() as connection:
            report = stage(connection, json.loads(args.snapshot.read_text(encoding='utf-8')),
                           json.loads(args.key.read_text(encoding='utf-8')), args.actor)
        print(json.dumps(report))
    finally:
        db.close()


if __name__ == '__main__':
    try:
        main()
    except ValueError as error:
        raise SystemExit(str(error)) from None
    except Exception as error:
        cause = getattr(getattr(error.__cause__, 'orig', None), 'sqlstate', None)
        raise SystemExit(f'Staging rolled back ({type(error).__name__}, SQLSTATE {cause or "n/a"}).') from None
