from __future__ import annotations

import json
from uuid import UUID, uuid4

from sqlalchemy import text

from app.db.database import Database
from app.domain.test_engine import TestEngineForbidden
from app.schemas.tests import CreateTestDraft, CreateTestVersion


class TestAuthoringRepository:
    """Admin-only authoring operations; published content is version-snapshotted."""

    __test__ = False

    def __init__(self, database: Database):
        self.database = database

    def create_draft(self, *, actor_id: str, draft: CreateTestDraft, request_id: str) -> dict:
        actor = UUID(actor_id)
        test_id = uuid4()
        with self.database.transaction() as connection:
            row = connection.execute(
                text(
                    "INSERT INTO public.tests "
                    "(id,examination_code,title,kind,visibility,owner_id,created_by,status) "
                    "VALUES (:id,:exam,:title,:kind,:visibility,:owner,:actor,'draft') "
                    "RETURNING id,title,status"
                ),
                {
                    "id": test_id,
                    "exam": draft.examination_code,
                    "title": draft.title,
                    "kind": draft.kind,
                    "visibility": draft.visibility,
                    "owner": actor if draft.visibility == "private" else None,
                    "actor": actor,
                },
            ).mappings().one()
            self._audit(
                connection,
                actor_id=actor,
                action="test.created",
                entity_id=str(test_id),
                request_id=request_id,
                after={"title": draft.title, "kind": draft.kind, "visibility": draft.visibility},
            )
        return {"id": str(row["id"]), "title": row["title"], "status": row["status"]}

    def create_version(
        self,
        *,
        actor_id: str,
        test_id: str,
        version: CreateTestVersion,
        request_id: str,
    ) -> dict:
        actor = UUID(actor_id)
        try:
            test_uuid = UUID(test_id)
        except ValueError:
            raise TestEngineForbidden("test_unavailable") from None
        version_id = uuid4()
        question_count = 0
        with self.database.transaction() as connection:
            test = connection.execute(
                text(
                    "SELECT id,examination_code,status FROM public.tests WHERE id=:test_id FOR UPDATE"
                ),
                {"test_id": test_uuid},
            ).mappings().first()
            if test is None or test["status"] == "archived":
                raise TestEngineForbidden("test_unavailable")
            version_number = int(connection.execute(
                text("SELECT COALESCE(max(version_number),0)+1 FROM public.test_versions WHERE test_id=:test_id"),
                {"test_id": test_uuid},
            ).scalar_one())
            connection.execute(
                text(
                    "INSERT INTO public.test_versions "
                    "(id,test_id,version_number,duration_seconds,attempt_limit,available_from,available_until,"
                    "shuffle_questions,shuffle_options,review_policy,status) "
                    "VALUES (:id,:test_id,:number,:duration,:limit,:available_from,:available_until,"
                    ":shuffle_questions,:shuffle_options,CAST(:review_policy AS jsonb),'draft')"
                ),
                {
                    "id": version_id,
                    "test_id": test_uuid,
                    "number": version_number,
                    "duration": version.duration_seconds,
                    "limit": version.attempt_limit,
                    "available_from": version.available_from,
                    "available_until": version.available_until,
                    "shuffle_questions": version.shuffle_questions,
                    "shuffle_options": version.shuffle_options,
                    "review_policy": json.dumps(version.review_policy.model_dump(mode="json")),
                },
            )
            for section in version.sections:
                section_id = uuid4()
                connection.execute(
                    text(
                        "INSERT INTO public.test_sections "
                        "(id,test_version_id,code,title,display_order) "
                        "VALUES (:id,:version_id,:code,:title,:display_order)"
                    ),
                    {
                        "id": section_id,
                        "version_id": version_id,
                        "code": section.code,
                        "title": section.title.strip(),
                        "display_order": section.display_order,
                    },
                )
                for question in section.questions:
                    source = connection.execute(
                        text(
                            "SELECT id,question,options,correct_option,explanation "
                            "FROM public.questions WHERE id=:question_id AND exam=:exam AND status='published'"
                        ),
                        {"question_id": question.question_id, "exam": test["examination_code"]},
                    ).mappings().first()
                    options = source["options"] if source is not None else None
                    if (
                        source is None
                        or not isinstance(options, list)
                        or len(options) != 4
                        or source["correct_option"] is None
                        or not 0 <= int(source["correct_option"]) <= 3
                    ):
                        raise TestEngineForbidden("question_unavailable")
                    connection.execute(
                        text(
                            "INSERT INTO public.test_questions "
                            "(id,test_section_id,question_id,display_order,marks,negative_marks,question_snapshot,"
                            "options_snapshot,correct_option_snapshot,explanation_snapshot) "
                            "VALUES (:id,:section_id,:question_id,:display_order,:marks,:negative_marks,:question,"
                            "CAST(:options AS jsonb),:correct_option,:explanation)"
                        ),
                        {
                            "id": uuid4(),
                            "section_id": section_id,
                            "question_id": source["id"],
                            "display_order": question.display_order,
                            "marks": question.marks,
                            "negative_marks": question.negative_marks,
                            "question": source["question"],
                            "options": json.dumps(options, ensure_ascii=False),
                            "correct_option": int(source["correct_option"]),
                            "explanation": source["explanation"],
                        },
                    )
                    question_count += 1
            self._audit(
                connection,
                actor_id=actor,
                action="test.version_created",
                entity_id=str(version_id),
                request_id=request_id,
                after={"test_id": str(test_uuid), "version_number": version_number, "question_count": question_count},
            )
        return {
            "id": str(version_id),
            "test_id": str(test_uuid),
            "version_number": version_number,
            "question_count": question_count,
            "status": "draft",
        }

    def publish_version(self, *, actor_id: str, test_id: str, version_id: str, request_id: str) -> dict:
        actor = UUID(actor_id)
        try:
            test_uuid, version_uuid = UUID(test_id), UUID(version_id)
        except ValueError:
            raise TestEngineForbidden("test_version_unavailable") from None
        with self.database.transaction() as connection:
            row = connection.execute(
                text(
                    "SELECT t.id AS test_id,t.status AS test_status,v.id AS version_id,v.version_number,v.status "
                    "FROM public.tests AS t JOIN public.test_versions AS v ON v.test_id=t.id "
                    "WHERE t.id=:test_id AND v.id=:version_id FOR UPDATE OF t,v"
                ),
                {"test_id": test_uuid, "version_id": version_uuid},
            ).mappings().first()
            if row is None or row["test_status"] == "archived" or row["status"] != "draft":
                raise TestEngineForbidden("test_version_unavailable")
            sections = connection.execute(
                text(
                    "SELECT s.id,s.default_marks,s.default_negative_marks,count(q.id) AS question_count "
                    "FROM public.test_sections AS s LEFT JOIN public.test_questions AS q ON q.test_section_id=s.id "
                    "WHERE s.test_version_id=:version_id GROUP BY s.id"
                ),
                {"version_id": version_uuid},
            ).mappings().all()
            if not sections or any(int(section["question_count"]) < 1 for section in sections):
                raise TestEngineForbidden("test_version_empty")
            publish_time = connection.execute(text("SELECT clock_timestamp()")).scalar_one()
            connection.execute(
                text(
                    "UPDATE public.test_versions SET status='published',published_at=:published_at, "
                    "updated_at=:published_at WHERE id=:version_id"
                ),
                {"published_at": publish_time, "version_id": version_uuid},
            )
            connection.execute(
                text("UPDATE public.tests SET status='published',updated_at=:published_at WHERE id=:test_id"),
                {"published_at": publish_time, "test_id": test_uuid},
            )
            self._audit(
                connection,
                actor_id=actor,
                action="test.version_published",
                entity_id=str(version_uuid),
                request_id=request_id,
                after={"test_id": str(test_uuid), "version_number": int(row["version_number"])},
            )
        return {
            "id": str(version_uuid),
            "test_id": str(test_uuid),
            "version_number": int(row["version_number"]),
            "status": "published",
            "published_at": publish_time,
        }

    @staticmethod
    def _audit(connection, *, actor_id: UUID, action: str, entity_id: str, request_id: str, after: dict) -> None:
        connection.execute(
            text(
                "INSERT INTO public.admin_audit_log "
                "(actor_user_id,action_code,entity_type,entity_id,request_id,after_state) "
                "VALUES (:actor,:action,'test',:entity_id,:request_id,CAST(:after_state AS jsonb))"
            ),
            {
                "actor": actor_id,
                "action": action,
                "entity_id": entity_id,
                "request_id": request_id,
                "after_state": json.dumps(after),
            },
        )
