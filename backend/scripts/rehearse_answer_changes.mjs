// Execute the actual repository's generated answer-save SQL on isolated Postgres.
// No environment settings, live database or student records are used.
import { PGlite } from '../.tmp/bootstrap-rehearsal/node_modules/@electric-sql/pglite/dist/index.js'
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const backend = fileURLToPath(new URL('../', import.meta.url))
const python = fileURLToPath(new URL('../.venv/Scripts/python.exe', import.meta.url))
const extract = spawnSync(python, ['-B', '-c', `
import json
from contextlib import contextmanager
from datetime import datetime,timedelta,timezone
from uuid import uuid4
from app.db.test_engine import TestEngineRepository
now=datetime.now(timezone.utc)
captured=[]
class Result:
 def __init__(self,row): self.row=row
 def mappings(self): return self
 def first(self): return self.row
 def all(self): return [] if self.row is None else [self.row]
class Connection:
 def execute(self,sql,params):
  query=str(sql)
  if 'SELECT a.status' in query:
   return Result(dict(status='in_progress',started_at=now,deadline_at=now+timedelta(hours=1),server_time=now,
     test_version_id=uuid4(),test_section_id=uuid4(),options_snapshot=['a','b','c','d']))
  if 'RETURNING attempt_question_id' in query:
   captured.append(query)
   return Result(dict(attempt_question_id=params['question_id'],selected_option_id=params['selected_option_id'],version=1,saved_at=now))
  return Result(None)
class Database:
 @contextmanager
 def transaction(self): yield Connection()
repo=TestEngineRepository(Database())
for version in [0,1]:
 repo.save_answer(attempt_id=str(uuid4()),attempt_question_id=str(uuid4()),user_id=str(uuid4()),selected_option_id='option-0',expected_version=version)
print(json.dumps(captured))
`], { cwd: backend, encoding: 'utf8' })
assert.equal(extract.status, 0, extract.stderr)
const statements = JSON.parse(extract.stdout)
assert.equal(statements.length, 2)
const db = new PGlite()
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE nimcet_backend;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);`)
  await db.exec('CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN END; $$')
  const migrations = new URL('../../supabase/migrations/', import.meta.url)
  for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(name, migrations), 'utf8'))
  }
  const [user, test, version, section, question, attempt, aq, unsaved] = Array.from({ length: 8 }, () => crypto.randomUUID())
  await db.query('INSERT INTO auth.users(id) VALUES($1)', [user])
  await db.query("INSERT INTO tests(id,examination_code,title,kind) VALUES($1,'NIMCET','Synthetic answer-change check','custom')", [test])
  await db.query('INSERT INTO test_versions(id,test_id,version_number,duration_seconds) VALUES($1,$2,1,3600)', [version, test])
  await db.query("INSERT INTO test_sections(id,test_version_id,code,title,display_order) VALUES($1,$2,'M','Math',0)", [section, version])
  const source = (await db.query(`INSERT INTO questions(exam_year,section,question_number,question,options,correct_option)
    VALUES(2026,'Math',1,'Synthetic question','["A","B","C","D"]',1) RETURNING id`)).rows[0].id
  await db.query(`INSERT INTO test_questions(id,test_section_id,question_id,display_order,question_snapshot,options_snapshot,correct_option_snapshot)
    VALUES($1,$2,$3,0,'Synthetic snapshot','["A","B","C","D"]',1)`, [question, section, source])
  await db.query("INSERT INTO test_attempts(id,test_version_id,user_id,attempt_number,deadline_at) VALUES($1,$2,$3,1,now()+interval '1 hour')", [attempt, version, user])
  const secondAttempt = crypto.randomUUID()
  await db.query("INSERT INTO test_attempts(id,test_version_id,user_id,attempt_number,deadline_at) VALUES($1,$2,$3,2,now()+interval '1 hour')", [secondAttempt, version, user])
  for (const [id, attemptId] of [[aq, attempt], [unsaved, secondAttempt]]) {
    await db.query("INSERT INTO attempt_questions(id,attempt_id,test_question_id,display_order,option_order) VALUES($1,$2,$3,0,'[0,1,2,3]')", [id, attemptId, question])
  }
  async function save(expected, selected, id = aq) {
    const params = { expected_version: expected, selected_option_id: selected, question_id: id }
    const names = []
    const sql = statements[expected === 0 ? 0 : 1].replace(/:([a-z_]+)/g, (_, name) => {
      if (!names.includes(name)) names.push(name)
      return `$${names.indexOf(name) + 1}`
    })
    return (await db.query(sql, names.map(name => params[name]))).rows
  }
  assert.equal((await save(0, 'option-0'))[0].version, 1)
  let changed = (await save(1, 'option-2'))[0]
  assert.equal(changed.version, 2); assert.equal(changed.selected_option_id, 'option-2')
  assert.equal((await save(1, 'option-3')).length, 0, 'Stale versions must be rejected')
  const cleared = (await save(2, null))[0]
  assert.equal(cleared.version, 3); assert.equal(cleared.selected_option_id, null)
  assert.equal((await save(3, 'option-1'))[0].version, 4)
  assert.equal((await save(0, 'option-3')).length, 0, 'First-save replay must not overwrite an answer')
  assert.equal((await save(4, 'option-3', unsaved)).length, 0, 'A missing answer must not be created with a nonzero version')
  const stored = (await db.query('SELECT selected_option_id,version FROM attempt_answers WHERE attempt_question_id=$1', [aq])).rows[0]
  assert.equal(stored.selected_option_id, 'option-1'); assert.equal(stored.version, 4)
  await db.query("UPDATE test_attempts SET status='submitted',submitted_at=now(),submission_reason='student_submitted' WHERE id=$1", [attempt])
  await assert.rejects(save(4, 'option-3'))
  console.log('Passed: actual repository SQL inserts, changes, clears and reselects answers; rejects stale/missing versions and finalized edits on isolated PostgreSQL.')
} finally { await db.close() }
