"""Validate production config and required baseline tables/grants without changing data."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.core.config import Settings
from app.core.deployment import deployment_errors
from app.db.database import Database


def main():
    settings = Settings()
    errors = deployment_errors(settings)
    if errors:
        for error in errors:
            print(error)
        return 1
    database = Database(settings.database_url.get_secret_value(), **settings.database_options())
    try:
        with database.read_only_transaction() as connection:
            for table in ("questions", "roles", "user_roles", "admin_audit_log", "tests", "test_versions",
                          "test_sections", "test_questions", "test_attempts", "attempt_questions",
                          "attempt_answers", "test_submissions", "test_results", "section_results"):
                # Constant allowlist, never user input.
                connection.execute(text(f"SELECT * FROM public.{table} LIMIT 0"))
            for table, privileges in {
                "test_attempts": ("INSERT", "UPDATE"), "attempt_questions": ("INSERT", "UPDATE"),
                "attempt_answers": ("INSERT", "UPDATE"), "test_submissions": ("INSERT",),
                "test_results": ("INSERT",), "section_results": ("INSERT",),
            }.items():
                for privilege in privileges:
                    if not connection.execute(text("SELECT has_table_privilege(current_user, :table, :privilege)"),
                                              {"table": f"public.{table}", "privilege": privilege}).scalar_one():
                        raise RuntimeError("Missing runtime write grant")
            if settings.question_authoring_enabled:
                connection.execute(text("SELECT q.content_document,q.subtopic_id,o.position FROM public.questions q "
                                        "JOIN public.question_occurrences o ON o.question_id=q.id LIMIT 0"))
            if settings.phase5_enabled:
                connection.execute(text("SELECT s.duration_seconds,q.question_blocks_snapshot,q.alternate_correct_option_snapshot,p.metadata "
                                        "FROM public.test_sections s JOIN public.test_questions q ON q.test_section_id=s.id "
                                        "JOIN public.pyq_papers p ON p.test_version_id=s.test_version_id LIMIT 0"))
            if settings.admin_workflows_enabled:
                connection.execute(text("SELECT status FROM public.account_status LIMIT 0"))
        print("Production configuration, database TLS and baseline read/write grants passed.")
        print("Run the student acceptance checklist to verify writes and ownership enforcement.")
        return 0
    finally:
        database.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        raise SystemExit("Deployment preflight failed; check schema, runtime grants, TLS and database connectivity.") from None
