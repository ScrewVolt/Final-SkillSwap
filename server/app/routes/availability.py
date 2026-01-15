from datetime import datetime, timezone
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import and_

from ..extensions import db
from ..models.availabililty import Availability  # (keep your filename as-is)

availability_bp = Blueprint("availability", __name__)

DEFAULT_TZ = "America/Denver"


def parse_dt(value: str):
    """
    Accepts:
      - "YYYY-MM-DDTHH:MM"
      - "YYYY-MM-DDTHH:MM:SS"
      - also handles trailing 'Z' -> UTC
    Returns: naive datetime (local) or aware datetime depending on input.
    """
    if not value:
        raise ValueError("Missing datetime")

    s = value.strip()

    # allow ISO strings with "Z"
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"

    return datetime.fromisoformat(s)


def overlaps(start_a, end_a, start_b, end_b):
    # Overlap if: start_a < end_b AND end_a > start_b
    return start_a < end_b and end_a > start_b


@availability_bp.get("")
@jwt_required()
def list_my_availability():
    user_id = int(get_jwt_identity())

    slots = (
        Availability.query.filter_by(user_id=user_id, is_active=True)
        .order_by(Availability.start_time.asc())
        .all()
    )

    return [
        {
            "id": a.id,
            "start_time": a.start_time.isoformat(),
            "end_time": a.end_time.isoformat(),
            "timezone": a.timezone,
            "is_active": a.is_active,
        }
        for a in slots
    ], 200


@availability_bp.post("")
@jwt_required()
def create_availability():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    start = data.get("start_time")
    end = data.get("end_time")
    tz = (data.get("timezone") or DEFAULT_TZ).strip()

    if not start or not end:
        return {"error": "start_time and end_time are required."}, 400

    try:
        start_dt = parse_dt(start)
        end_dt = parse_dt(end)
    except ValueError:
        return {"error": "Invalid datetime format. Use ISO like '2026-01-14T19:00'."}, 400

    if end_dt <= start_dt:
        return {"error": "end_time must be after start_time."}, 400

    # Optional: block past availability
    # (Uses server time; ok for MVP. If you want strict timezone correctness, we can do zoneinfo.)
    now = datetime.utcnow()
    if start_dt.replace(tzinfo=None) < now:
        return {"error": "start_time must be in the future."}, 400

    # Prevent overlaps against existing active slots
    # Overlap condition: existing.start < new_end AND existing.end > new_start
    conflict = (
        Availability.query.filter(
            Availability.user_id == user_id,
            Availability.is_active == True,  # noqa: E712
            Availability.start_time < end_dt,
            Availability.end_time > start_dt,
        )
        .first()
    )

    if conflict:
        return {
            "error": "This time overlaps an existing availability slot.",
            "conflict": {
                "id": conflict.id,
                "start_time": conflict.start_time.isoformat(),
                "end_time": conflict.end_time.isoformat(),
                "timezone": conflict.timezone,
            },
        }, 409

    slot = Availability(
        user_id=user_id,
        start_time=start_dt,
        end_time=end_dt,
        timezone=tz,
        is_active=True,
    )

    db.session.add(slot)
    db.session.commit()
    return {"id": slot.id, "message": "Availability slot created."}, 201


@availability_bp.delete("/<int:slot_id>")
@jwt_required()
def delete_availability(slot_id):
    user_id = int(get_jwt_identity())

    slot = Availability.query.get(slot_id)
    if not slot or slot.user_id != user_id:
        return {"error": "Not found."}, 404

    # ✅ Recommended: soft delete to avoid weird scheduling edge cases
    slot.is_active = False
    db.session.commit()

    return {"message": "Availability slot deleted."}, 200
