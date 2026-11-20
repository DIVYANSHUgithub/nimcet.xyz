"""Build the NIMCET 2026 draft and its source-review blueprint from uploaded records."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain.question_content import statement_blocks, statement_text
from app.schemas.pyq import PaperSectionBlueprint
from app.schemas.tests import CreateTestDraft, CreateTestVersion

BROCHURE = 'https://nimcet.admissions.nic.in/document/information-brochure-2026/'
TITLE = 'NIMCET 2026 PYQ'
PARTS = (
    ('MATHEMATICS', 'Mathematics', 70, (
        ('Mathematics', 1, 50, '12', '3'),
    )),
    ('REASONING', 'Analytical Ability & Logical Reasoning', 30, (
        ('Analytical Ability & Logical Reasoning', 1, 40, '6', '1.5'),
    )),
    ('COMPUTER_AWARENESS', 'Computer Awareness & General English', 20, (
        ('Computer Awareness', 1, 20, '6', '1.5'),
        ('General English', 21, 30, '4', '1'),
    )),
)


def assemble(records, reviewed_key=None):
    indexed = {}
    ids = set()
    for record in records:
        key = (record['section'], record['question_number'])
        question = record['question']
        options = record['options']
        answer = record['correct_option']
        if (record['exam'], record['exam_year'], record['status']) != ('NIMCET', 2026, 'published'):
            raise ValueError('The export must contain only published NIMCET 2026 questions.')
        if key in indexed or record['id'] in ids:
            raise ValueError('The export contains a duplicate question or position.')
        if not isinstance(options, list) or len(options) != 4 or type(answer) is not int or answer not in range(4):
            raise ValueError('Each question must have four options and a stored answer.')
        if not statement_text(question, statement_blocks(question)).strip():
            raise ValueError('Every question must have a statement or illustration.')
        indexed[key] = record['id']
        ids.add(record['id'])
    expected_positions = {(subject, position) for _, _, _, groups in PARTS
                          for subject, start, end, _, _ in groups for position in range(start, end + 1)}
    if indexed.keys() != expected_positions:
        raise ValueError('The export must contain all 120 original positions across the four subjects.')

    accepted = {}
    if reviewed_key is not None:
        for row in reviewed_key:
            position = (row['section'], row['position'])
            options = row['accepted_indexes']
            if indexed.get(position) != row['id'] or position in accepted or len(options) not in (1, 2):
                raise ValueError('The reviewed key does not match the uploaded question positions.')
            if len(set(options)) != len(options) or any(type(index) is not int or index not in range(4) for index in options):
                raise ValueError('The reviewed key contains an invalid accepted option.')
            accepted[position] = options
        if accepted.keys() != expected_positions:
            raise ValueError('The reviewed key must cover all 120 positions.')

    sections, blueprint = [], []
    for display_order, (code, title, minutes, groups) in enumerate(PARTS):
        questions, marking_groups = [], []
        for subject, start, end, marks, penalty in groups:
            marking_groups.append(dict(title=subject, question_count=end - start + 1,
                                       marks=marks, negative_marks=penalty))
            for position in range(start, end + 1):
                question = dict(question_id=indexed[subject, position], display_order=len(questions),
                                marks=marks, negative_marks=penalty)
                if accepted:
                    reviewed = accepted[subject, position]
                    question['correct_option_override'] = reviewed[0]
                    if len(reviewed) == 2:
                        question['alternate_correct_option'] = reviewed[1]
                questions.append(question)
        sections.append(dict(code=code, title=title, display_order=display_order,
                             duration_seconds=minutes * 60, questions=questions))
        blueprint.append(PaperSectionBlueprint(code=code, duration_seconds=minutes * 60,
                                               question_count=len(questions), marking_groups=marking_groups))
    draft = CreateTestDraft(title=TITLE, kind='pyq', examination_code='NIMCET')
    version = CreateTestVersion(duration_seconds=7200, sections=sections)
    return draft, version, blueprint


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('questions', type=Path, help='Local JSON export of the 120 questions')
    parser.add_argument('draft', type=Path, help='Output path for the local authoring payload')
    args = parser.parse_args()
    draft, version, blueprint = assemble(json.loads(args.questions.read_text(encoding='utf-8')))
    result = {
        'draft': draft.model_dump(mode='json'),
        'version': version.model_dump(mode='json'),
        'verification': {
            'paper': {
                'examination_code': draft.examination_code, 'year': 2026, 'original_title': draft.title,
                'duration_seconds': version.duration_seconds, 'source_url': BROCHURE,
                'source_verification': 'unverified', 'answer_key_verification': 'unverified', 'state': 'draft',
            },
            'sections': [section.model_dump(mode='json') for section in blueprint],
        },
    }
    args.draft.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
