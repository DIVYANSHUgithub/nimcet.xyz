import { PGlite } from '../.tmp/bootstrap-rehearsal/node_modules/@electric-sql/pglite/dist/index.js'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite()
const root=new URL('../../supabase/migrations/',import.meta.url)
async function denied(sql,params=[]){await assert.rejects(()=>db.query(sql,params))}
try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE ROLE nimcet_backend;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);GRANT USAGE ON SCHEMA public TO nimcet_backend;`)
 await db.exec('CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN END; $$')
 for(const name of readdirSync(root).filter(n=>n.endsWith('.sql')).sort())await db.exec(readFileSync(new URL(name,root),'utf8'))
 const [student,actor,test,version,section,tq,media]=Array.from({length:7},()=>crypto.randomUUID())
 await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[student,actor])
 assert.deepEqual((await db.query('SELECT r.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1 AND revoked_at IS NULL',[student])).rows,[{code:'student'}])
 assert.equal((await db.query("SELECT count(*)::int AS n FROM admin_audit_log WHERE action_code='role.student_registered'")).rows[0].n,2)
 await denied("INSERT INTO user_roles(user_id,role_id,grant_reason) SELECT $1,id,'Duplicate role forbidden' FROM roles WHERE code='administrator'",[student])
 await db.query("INSERT INTO tests(id,examination_code,title,kind) VALUES($1,'SYNTHETIC','Admin workflow fixture','full_length')",[test])
 await db.query('INSERT INTO test_versions(id,test_id,version_number,duration_seconds) VALUES($1,$2,1,3600)',[version,test])
 await db.query("INSERT INTO test_sections(id,test_version_id,code,title,display_order) VALUES($1,$2,'MATH','Mathematics',0)",[section,version])
 const q=(await db.query(`INSERT INTO questions(exam_year,section,question_number,question,options,correct_option) VALUES(2025,'Math',1,'Synthetic admin fixture','["A","B","C","D"]',1) RETURNING id`)).rows[0].id
 await db.query(`INSERT INTO test_questions(id,test_section_id,question_id,display_order,question_snapshot,options_snapshot,correct_option_snapshot) VALUES($1,$2,$3,0,'Frozen fixture','["A","B","C","D"]',1)`,[tq,section,q])
 await db.query("UPDATE test_versions SET workflow_state='submitted',workflow_revision=workflow_revision+1,submitted_by=$2 WHERE id=$1",[version,actor])
 for(const state of ['submitted','approved']){
  await db.query('UPDATE test_versions SET workflow_state=$2 WHERE id=$1',[version,state])
  await denied('UPDATE test_versions SET duration_seconds=120 WHERE id=$1',[version])
  await denied("UPDATE test_sections SET title='Changed' WHERE id=$1",[section])
  await denied("UPDATE test_questions SET correct_option_snapshot=0 WHERE id=$1",[tq])
  await denied('DELETE FROM test_questions WHERE id=$1',[tq])
 }
 await db.query("UPDATE test_versions SET workflow_state='rejected' WHERE id=$1",[version])
 await db.query('UPDATE test_versions SET duration_seconds=120 WHERE id=$1',[version])
 await db.query("INSERT INTO question_media(id,object_path,content_type,byte_size,created_by) VALUES($1,'synthetic/admin.png','image/png',100,$2)",[media,actor])
 await db.exec('SET ROLE nimcet_backend')
 await db.query("INSERT INTO account_status(user_id,status,reason,changed_by) VALUES($1,'suspended','Synthetic suspension test',$2)",[student,actor])
 assert.equal((await db.query("SELECT count(*)::int AS n FROM account_status WHERE user_id=$1 AND status='suspended' AND(suspended_until IS NULL OR suspended_until>now())",[student])).rows[0].n,1)
 await db.query('UPDATE question_media SET archived_at=now(),archived_by=$2 WHERE id=$1',[media,actor])
 assert.ok((await db.query('SELECT archived_at FROM question_media WHERE id=$1',[media])).rows[0].archived_at)
 await denied('DELETE FROM account_status WHERE user_id=$1',[student])
 await denied('DELETE FROM question_media WHERE id=$1',[media])
 await db.exec('RESET ROLE')
 for(const role of ['anon','authenticated']){
  await db.exec(`SET ROLE ${role}`)
  for(const table of ['account_status','user_roles','admin_audit_log','test_versions','question_media'])await denied(`SELECT * FROM ${table}`)
  await denied('SELECT nimcet_private.assign_new_student()')
  await db.exec('RESET ROLE')
 }
 console.log('Admin isolated PostgreSQL rehearsal passed: complete migration replay, Student-only registration and audit, unique primary role, frozen review content/configuration, runtime suspension/media grants, forbidden deletes, and client denial.')
}finally{await db.close()}
