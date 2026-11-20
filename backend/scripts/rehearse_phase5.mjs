import { PGlite } from '../.tmp/bootstrap-rehearsal/node_modules/@electric-sql/pglite/dist/index.js'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
const root=new URL('../../supabase/migrations/',import.meta.url)
const reject=async sql=>{let failed=false;try{await db.exec(sql)}catch{failed=true}assert.ok(failed,sql)}
try {
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE nimcet_backend;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);GRANT USAGE ON SCHEMA public TO nimcet_backend;`)
 await db.exec('CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN END; $$')
 for(const name of readdirSync(root).filter(n=>n.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(name,root),'utf8'))
 const [user,test,version,section,tq,attempt,aq]=Array.from({length:7},()=>crypto.randomUUID())
 await db.query('INSERT INTO auth.users(id) VALUES($1)',[user])
 await db.query("INSERT INTO tests(id,examination_code,title,kind) VALUES($1,'SYNTHETIC','Synthetic paper','pyq')",[test])
 await db.query('INSERT INTO test_versions(id,test_id,version_number,duration_seconds) VALUES($1,$2,1,3600)',[version,test])
 await db.query("INSERT INTO test_sections(id,test_version_id,code,title,display_order) VALUES($1,$2,'MATH','Mathematics',0)",[section,version])
 const q=(await db.query(`INSERT INTO questions(exam_year,section,question_number,question,options,correct_option) VALUES(2025,'Math',1,'Original fixture','["A","B","C","D"]',1) RETURNING id`)).rows[0].id
 await db.query(`INSERT INTO test_questions(id,test_section_id,question_id,display_order,question_snapshot,options_snapshot,correct_option_snapshot,question_blocks_snapshot)
 VALUES($1,$2,$3,0,'Frozen fixture','["A","B","C","D"]',1,'[{"type":"text","text":"Frozen rich fixture"}]')`,[tq,section,q])
 await db.query("INSERT INTO pyq_papers(test_version_id,examination_code,year,title,metadata,snapshot_digest,approved_by) VALUES($1,'SYNTHETIC',2025,'Synthetic paper','{}',repeat('a',64),$2)",[version,user])
 await db.query("UPDATE test_versions SET status='published',published_at=now() WHERE id=$1",[version])
 await reject(`UPDATE pyq_papers SET title='Changed' WHERE test_version_id='${version}'`)
 await reject(`UPDATE test_questions SET question_snapshot='Changed' WHERE id='${tq}'`)
 await db.query("UPDATE questions SET question='Changed canonical fixture' WHERE id=$1",[q])
 assert.equal((await db.query('SELECT question_snapshot FROM test_questions WHERE id=$1',[tq])).rows[0].question_snapshot,'Frozen fixture')
 await db.query("INSERT INTO test_attempts(id,test_version_id,user_id,attempt_number,deadline_at) VALUES($1,$2,$3,1,now()+interval '1 hour')",[attempt,version,user])
 await db.query("INSERT INTO attempt_questions(id,attempt_id,test_question_id,display_order,option_order) VALUES($1,$2,$3,0,'[0,1,2,3]')",[aq,attempt,tq])
 await db.query("INSERT INTO attempt_answers(attempt_question_id,selected_option_id) VALUES($1,'option-1')",[aq])
 await db.query("UPDATE test_attempts SET status='submitted',submitted_at=now(),submission_reason='student_submitted' WHERE id=$1",[attempt])
 await db.query("INSERT INTO test_submissions(attempt_id,submission_reason,submitted_at) VALUES($1,'student_submitted',now())",[attempt])
 await db.query('INSERT INTO test_results(attempt_id,score,maximum_score,correct_count,incorrect_count,unanswered_count) VALUES($1,4,4,1,0,0)',[attempt])
 await db.query('INSERT INTO section_results(attempt_id,test_section_id,score,maximum_score,correct_count,incorrect_count,unanswered_count) VALUES($1,$2,4,4,1,0,0)',[attempt,section])
 await reject(`UPDATE attempt_answers SET selected_option_id='option-0' WHERE attempt_question_id='${aq}'`)
 await reject(`UPDATE test_results SET score=999 WHERE attempt_id='${attempt}'`)
 await reject(`DELETE FROM section_results WHERE attempt_id='${attempt}'`)
 assert.equal((await db.query('SELECT scoring_version FROM test_results')).rows[0].scoring_version,'mcq-index-v1')
 await db.exec('SET ROLE nimcet_backend')
 assert.equal((await db.query('SELECT year FROM pyq_papers')).rows[0].year,2025)
 await db.exec('RESET ROLE;SET ROLE anon')
 for(const table of ['pyq_papers','test_results','section_results','attempt_answers']) await reject(`SELECT * FROM ${table}`)
 console.log('Phase 5 isolated PostgreSQL rehearsal passed: migration replay, immutable scores/answers/snapshots/PYQ approval, scoring version, runtime metadata access and anonymous denial.')
} finally {await db.close()}
