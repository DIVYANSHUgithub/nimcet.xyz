
import re
from uuid import UUID

from sqlalchemy import text


class DeviceConflict(Exception):
    pass


def device_type(user_agent: str) -> str:
    # Browsers do not expose a trusted physical device ID. Use the signed Auth
    # session for identity and the browser's reported form factor for its slot.
    return "mobile" if re.search(r"android|iphone|ipad|ipod|mobile", user_agent, re.I) else "desktop"


def claim_device(database, user_id: str, session_id: UUID, kind: str, *, replace: bool = False):
    params = {"user": UUID(user_id), "session": session_id, "kind": kind}
    with database.read_only_transaction() as connection:
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
        result = connection.execute(text(
            "INSERT INTO public.student_device_sessions (user_id,device_type,session_id) "
            "VALUES (:user,:kind,:session) ON CONFLICT (user_id,device_type) DO UPDATE "
            "SET session_id=excluded.session_id,claimed_at=clock_timestamp() "
            "WHERE :replace OR student_device_sessions.session_id=excluded.session_id "
            "RETURNING session_id"
        ), {**params, "replace": replace}).scalar_one_or_none()
        if result is None:
            raise DeviceConflict
