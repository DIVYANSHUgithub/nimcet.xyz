import { PGlite } from '../.tmp/bootstrap-rehearsal/node_modules/@electric-sql/pglite/dist/index.js'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'
const db = new PGlite()
const read = name => readFileSync(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8')
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE nimcet_backend;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    GRANT USAGE ON SCHEMA public TO nimcet_backend;`)
  for (const name of ['20261101000000_create_catalog_tables.sql','20261101010000_create_trusted_roles_and_admin_audit.sql','20261101015000_create_questions_table.sql']) await db.exec(read(name))
  await db.exec(`INSERT INTO questions(exam_year,section,question_number,question,options,correct_option) VALUES(2026,'Math',1,'Legacy synthetic fixture','["A","B","C","D"]',0)`)
  const names = readdirSync(new URL('../../supabase/migrations/', import.meta.url))
  await db.exec(read(names.find(name => name.endsWith('_phase2_question_bank.sql'))))
  assert.equal((await db.query('SELECT content_document,revision FROM questions WHERE id=1')).rows[0].content_document,null)
  await db.exec('SET ROLE nimcet_backend')
  assert.equal((await db.query('SELECT count(*)::int AS count FROM questions')).rows[0].count,1)
  const [exam, subject, topic, subtopic, section] = Array.from({length:5}, () => crypto.randomUUID())
  await db.query("INSERT INTO examinations(id,code,name) VALUES($1,'SYNTHETIC','Synthetic exam')",[exam])
  await db.query("INSERT INTO subjects(id,examination_id,code,name) VALUES($1,$2,'MATH','Mathematics')",[subject,exam])
  await db.query("INSERT INTO chapters(id,subject_id,code,name) VALUES($1,$2,'ALG','Algebra')",[topic,subject])
  await db.query("INSERT INTO topics(id,chapter_id,code,name) VALUES($1,$2,'LINEAR','Linear')",[subtopic,topic])
  await db.query("INSERT INTO sections(id,examination_id,code,name) VALUES($1,$2,'MATH','Math')",[section,exam])
  const ids=Array.from({length:4},()=>crypto.randomUUID())
  const document={schema_version:1,statement:[{type:'text',text:'Synthetic question'}],options:ids.map(id=>({id,blocks:[{type:'text',text:'Option'}]})),correct_option_id:ids[0],explanation:[{type:'text',text:'Explanation'}],occurrences:[]}
  const row=(await db.query(`INSERT INTO questions(exam,exam_year,section,question_number,question,options,correct_option,content_document,subtopic_id,revision,status)
     VALUES('SYNTHETIC',2026,'Math',2,'Synthetic question','["A","B","C","D"]',0,$1,$2,1,'draft') RETURNING id`,[JSON.stringify(document),subtopic])).rows[0]
  assert.equal((await db.query('UPDATE questions SET revision=revision+1 WHERE id=$1 AND revision=1 RETURNING id',[row.id])).rows.length,1)
  assert.equal((await db.query('UPDATE questions SET revision=revision+1 WHERE id=$1 AND revision=1 RETURNING id',[row.id])).rows.length,0)
  await db.query("INSERT INTO question_occurrences(question_id,exam,year,section,position,source) VALUES($1,'SYNTHETIC',2025,'Math',1,'Synthetic source')",[row.id])
  let duplicateDenied=false
  try { await db.query("INSERT INTO question_occurrences(question_id,exam,year,section,position,source) VALUES(1,'SYNTHETIC',2025,'Math',1,'Synthetic source')") } catch { duplicateDenied=true }
  assert.ok(duplicateDenied)
  const media=crypto.randomUUID()
  await db.query("INSERT INTO question_media(id,object_path,content_type,byte_size) VALUES($1,'synthetic/example.png','image/png',100)",[media])
  assert.equal((await db.query('SELECT count(*)::int AS count FROM question_media')).rows[0].count,1)
  await db.exec('RESET ROLE; SET ROLE anon')
  assert.equal((await db.query('SELECT id,question FROM questions')).rows.length,1)
  assert.equal((await db.query('SELECT correct_option FROM questions')).rows[0].correct_option, 0)
  await assert.rejects(db.query('SELECT content_document FROM questions'))
  let denied=false
  try { await db.query('SELECT * FROM question_media') } catch { denied=true }
  assert.ok(denied)
  await db.exec('RESET ROLE')
  assert.equal((await db.query('SELECT count(*)::int AS count FROM questions')).rows[0].count,2)
  console.log('Phase 2 isolated PostgreSQL rehearsal passed: legacy preservation, catalog FKs, runtime RLS/grants, revision conflicts, private media.')
} finally { await db.close() }
