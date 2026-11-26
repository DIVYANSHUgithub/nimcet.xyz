
import re
from uuid import UUID

from sqlalchemy import text

from app.db.database import DatabaseUnavailable


class DeviceConflict(Exception):
    pass


class DeviceSessionExpired(Exception):
    pass


def device_sessions_ready(database) -> bool:
    try:
        with database.read_only_transaction() as connection:
            return bool(connection.execute(text(
                "SELECT has_function_privilege(current_user, "
                "to_regprocedure('nimcet_private.device_session_started_at(uuid,uuid)'), 'EXECUTE') "
                "AND has_column_privilege(current_user, 'public.student_device_sessions', 'session_started_at', 'INSERT')"
            )).scalar_one())
    except DatabaseUnavailable:
        return False


def device_type(user_agent: str) -> str:
    # Browsers do not expose a trusted physical device ID. Use the signed Auth
    # session for identity and the browser's reported form factor for its slot.
    return "mobile" if re.search(r"android|iphone|ipad|ipod|mobile", user_agent, re.I) else "desktop"


def claim_device(database, user_id: str, session_id: UUID, kind: str, *, replace: bool = False):
    params = {"user": UUID(user_id), "session": session_id, "kind": kind}
    with database.read_only_transaction() as connection:
        started_at = connection.execute(text(
            "SELECT nimcet_private.device_session_started_at(:user, :session)"
        ), params).scalar_one()
        if started_at is None:
            raise DeviceSessionExpired
        existing = connection.execute(text(
            "SELECT device_type,session_id FROM public.student_device_sessions "
            "WHERE user_id=:user AND (device_type=:kind OR session_id=:session)"
        ), params).mappings().all()
    for row in existing:
        if row["session_id"] == session_id:
            if row["device_type"] != kind:
                raise DeviceConflict
            return
    if existing and not replace:
        raise DeviceConflict
    with database.transaction() as connection:
        # Serialize slot changes for this account, including changes between device types.
        connection.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"),
                           {"key": f"student-device:{user_id}"})
        slot = connection.execute(text(
            "SELECT device_type FROM public.student_device_sessions WHERE user_id=:user AND session_id=:session"
        ), params).scalar_one_or_none()
        if slot is not None and slot != kind:
            raise DeviceConflict
        result = connection.execute(text("""
            INSERT INTO public.student_device_sessions AS slot
                (user_id, device_type, session_id, session_started_at)
            VALUES (:user, :kind, :session, :started_at)
            ON CONFLICT (user_id, device_type) DO UPDATE
            SET session_id = excluded.session_id, session_started_at = excluded.session_started_at,
                claimed_at = clock_timestamp()
            WHERE slot.session_id = excluded.session_id OR (
                :replace AND (excluded.session_started_at, excluded.session_id) > (
                    coalesce(slot.session_started_at,
                             nimcet_private.device_session_started_at(slot.user_id, slot.session_id),
                             slot.claimed_at),
                    slot.session_id
                )
            )
            RETURNING session_id
        """), {**params, "started_at": started_at, "replace": replace}).scalar_one_or_none()
        if result is None:
            raise DeviceConflict
