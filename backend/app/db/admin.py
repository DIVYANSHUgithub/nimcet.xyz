from sqlalchemy import text

from app.db.database import Database

_SAFE_AUDIT_KEYS = frozenset({"user_id", "role_code", "revoked"})


def _safe_audit_state(value):
    if not isinstance(value, dict):
        return None
    return {
        key: field_value
        for key, field_value in value.items()
        if key in _SAFE_AUDIT_KEYS
        and isinstance(field_value, (str, bool))
        and len(str(field_value)) <= 128
    }


class AdminRepository:
    """Read-only dashboard summary sourced from the existing legacy table."""

    def __init__(self, database: Database):
        self.database = database

    def dashboard_counts(self) -> dict[str, int]:
        with self.database.read_only_transaction() as connection:
            row = connection.execute(
                text(
                    "SELECT count(*)::integer AS total_questions, "
                    "count(*) FILTER (WHERE status = 'published')::integer AS published_questions, "
                    "count(*) FILTER (WHERE status = 'draft')::integer AS draft_questions "
                    "FROM public.questions"
                )
            ).mappings().one()
        return {key: int(value) for key, value in row.items()}

    def audit_page(self, *, page: int, page_size: int) -> tuple[list[dict], int, int]:
        with self.database.read_only_transaction() as connection:
            total = int(connection.execute(
                text("SELECT count(*) FROM public.admin_audit_log")
            ).scalar_one())
            last_page = max(1, (total + page_size - 1) // page_size)
            actual_page = min(page, last_page)
            rows = connection.execute(
                text(
                    "SELECT id, actor_user_id, action_code, entity_type, entity_id, request_id, "
                    "reason, before_state, after_state, created_at "
                    "FROM public.admin_audit_log "
                    "ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset"
                ),
                {"limit": page_size, "offset": (actual_page - 1) * page_size},
            ).mappings().all()
        items = []
        for row in rows:
            item = dict(row)
            item["id"] = str(item["id"])
            if item.get("actor_user_id") is not None:
                item["actor_user_id"] = str(item["actor_user_id"])
            item["entity_id"] = str(item["entity_id"])
            item["before_state"] = _safe_audit_state(item.get("before_state"))
            item["after_state"] = _safe_audit_state(item.get("after_state"))
            items.append(item)
        return items, total, actual_page
