from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import or_

from ..extensions import db
from ..models.skill import Skill
from ..models.session_request import SessionRequest
from ..models.notification import Notification
from ..models.availabililty import Availability

sessions_bp = Blueprint("sessions", __name__)


def is_admin():
    return (get_jwt() or {}).get("role") == "admin"


def notify(user_id, ntype, title, body="", session_request_id=None, skill_id=None):
    n = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        body=body,
        session_request_id=session_request_id,
        skill_id=skill_id,
        is_read=False,
    )
    db.session.add(n)


def parse_iso(dt_str: str):
    """Parse ISO string safely (expects YYYY-MM-DDTHH:MM or full ISO)."""
    try:
        return datetime.fromisoformat(dt_str)
    except Exception:
        return None

def release_reserved_slot(req_id: int):
    """Release any slot reserved for this session request."""
    slot = Availability.query.filter_by(reserved_request_id=req_id).first()
    if slot:
        slot.reserved_request_id = None
        slot.reserved_at = None
        # If you choose to mark locked slots inactive on confirm,
        # don't auto-reactivate here unless you explicitly want that behavior.
        # slot.is_active = True
    return slot

@sessions_bp.post("/<int:request_id>/schedule")
@jwt_required()
def schedule_request(request_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    action = (data.get("action") or "").strip().lower()  # propose | confirm | clear

    req = SessionRequest.query.get(request_id)
    if not req:
        return {"error": "Request not found."}, 404

    if req.status != "accepted":
        return {"error": "Scheduling is only allowed for accepted requests."}, 400

    # ----------------------------
    # PROPOSE (requester proposes)
    # ----------------------------
    if action == "propose":
        if user_id != req.requester_id and not is_admin():
            return {"error": "Only the requester can propose a time."}, 403

        slot_id = data.get("slot_id")

        # If they re-propose, release any old reservation first
        release_reserved_slot(req.id)

        if slot_id:
            slot = Availability.query.get(int(slot_id))
            if not slot or slot.user_id != req.provider_id or not slot.is_active:
                return {"error": "Invalid availability slot."}, 400

            # ✅ Double-booking check:
            # allow if unreserved OR already reserved by THIS request (re-propose same)
            if slot.reserved_request_id and slot.reserved_request_id != req.id:
                return {"error": "That availability slot is already reserved."}, 409

            # Reserve it
            slot.reserved_request_id = req.id
            slot.reserved_at = datetime.utcnow()

            # Copy times onto request
            req.scheduled_start = slot.start_time
            req.scheduled_end = slot.end_time
            req.timezone = slot.timezone

        else:
            # Fallback: direct datetime proposal (no slot reservation)
            start = data.get("scheduled_start")
            end = data.get("scheduled_end")
            tz = (data.get("timezone") or "America/Denver").strip()

            if not start or not end:
                return {"error": "scheduled_start and scheduled_end are required."}, 400

            start_dt = parse_iso(start)
            end_dt = parse_iso(end)
            if not start_dt or not end_dt:
                return {"error": "Invalid datetime format."}, 400
            if end_dt <= start_dt:
                return {"error": "scheduled_end must be after scheduled_start."}, 400

            req.scheduled_start = start_dt
            req.scheduled_end = end_dt
            req.timezone = tz

        req.schedule_status = "proposed"
        req.responded_at = datetime.utcnow()

        notify(
            user_id=req.provider_id,
            ntype="schedule_proposed",
            title="New time proposed",
            body=f"A time was proposed for '{req.skill.title}'.",
            session_request_id=req.id,
            skill_id=req.skill_id,
        )

    # ----------------------------
    # CONFIRM (provider confirms)
    # ----------------------------
    elif action == "confirm":
        if user_id != req.provider_id and not is_admin():
            return {"error": "Only the provider can confirm."}, 403
        if req.schedule_status != "proposed" or not req.scheduled_start or not req.scheduled_end:
            return {"error": "Nothing to confirm yet."}, 400

        # ✅ Race-condition safety:
        # ensure the confirmed time is tied to a reserved slot (if using slot-based)
        slot = Availability.query.filter_by(reserved_request_id=req.id).first()
        if slot:
            # If you want *strict* slot-based scheduling, ensure the times still match:
            if slot.start_time != req.scheduled_start or slot.end_time != req.scheduled_end:
                return {"error": "Reserved slot no longer matches the proposed time."}, 409

            # Lock it so it can’t be used again
            slot.is_active = False

        req.schedule_status = "confirmed"
        req.responded_at = datetime.utcnow()

        notify(
            user_id=req.requester_id,
            ntype="schedule_confirmed",
            title="Session time confirmed",
            body=f"Your session time for '{req.skill.title}' was confirmed.",
            session_request_id=req.id,
            skill_id=req.skill_id,
        )

    # ----------------------------
    # CLEAR (either party)
    # ----------------------------
    elif action == "clear":
        if user_id not in (req.requester_id, req.provider_id) and not is_admin():
            return {"error": "Not authorized."}, 403

        # release reservation if any
        release_reserved_slot(req.id)

        req.scheduled_start = None
        req.scheduled_end = None
        req.timezone = None
        req.schedule_status = "none"
        req.responded_at = datetime.utcnow()

        other = req.provider_id if user_id == req.requester_id else req.requester_id
        notify(
            user_id=other,
            ntype="schedule_cleared",
            title="Schedule cleared",
            body=f"The schedule for '{req.skill.title}' was cleared.",
            session_request_id=req.id,
            skill_id=req.skill_id,
        )

    else:
        return {"error": "action must be propose, confirm, or clear."}, 400

    db.session.commit()
    return {"message": f"Schedule {req.schedule_status}."}, 200

@sessions_bp.post("/<int:request_id>/respond")
@jwt_required()
def respond_to_request(request_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    action = (data.get("action") or "").strip().lower()  # accept | decline | cancel | complete

    req = SessionRequest.query.get(request_id)
    if not req:
        return {"error": "Request not found."}, 404

    if action in ("accept", "decline"):
        if not (is_admin() or req.provider_id == user_id):
            return {"error": "Only the provider can accept/decline."}, 403
        if req.status != "pending":
            return {"error": "Only pending requests can be accepted/declined."}, 400

        req.status = "accepted" if action == "accept" else "declined"
        req.responded_at = datetime.utcnow()

        notify(
            user_id=req.requester_id,
            ntype=f"session_{req.status}",
            title=f"Your session request was {req.status}",
            body=f"Request for '{req.skill.title}' was {req.status}.",
            session_request_id=req.id,
            skill_id=req.skill_id,
        )

    elif action == "cancel":
        if not (is_admin() or req.requester_id == user_id):
            return {"error": "Only the requester can cancel."}, 403
        if req.status not in ("pending", "accepted"):
            return {"error": "Only pending/accepted requests can be cancelled."}, 400

        req.status = "cancelled"
        req.responded_at = datetime.utcnow()

        notify(
            user_id=req.provider_id,
            ntype="session_cancelled",
            title="Session request cancelled",
            body=f"A request for '{req.skill.title}' was cancelled.",
            session_request_id=req.id,
            skill_id=req.skill_id,
        )

    elif action == "complete":
        if not (is_admin() or user_id in (req.requester_id, req.provider_id)):
            return {"error": "Not authorized."}, 403
        if req.status != "accepted":
            return {"error": "Only accepted requests can be completed."}, 400

        req.status = "completed"
        req.responded_at = datetime.utcnow()

        other = req.provider_id if user_id == req.requester_id else req.requester_id
        notify(
            user_id=other,
            ntype="session_completed",
            title="Session marked completed",
            body=f"Session for '{req.skill.title}' was marked completed.",
            session_request_id=req.id,
            skill_id=req.skill_id,
        )

    else:
        return {"error": "action must be one of: accept, decline, cancel, complete."}, 400

    db.session.commit()
    return {"message": f"Request {req.status}."}, 200

@sessions_bp.get("/<int:request_id>/availability")
@jwt_required()
def get_provider_availability(request_id):
    user_id = int(get_jwt_identity())

    req = SessionRequest.query.get(request_id)
    if not req:
        return {"error": "Request not found."}, 404

    # Only requester/provider/admin can view provider availability for this request
    if not (is_admin() or user_id in (req.requester_id, req.provider_id)):
        return {"error": "Not authorized."}, 403

    # ✅ Only return slots that are:
    # - active
    # - owned by provider
    # - NOT reserved, OR reserved for THIS request
    slots = (
        Availability.query
        .filter(
            Availability.user_id == req.provider_id,
            Availability.is_active == True,  # noqa: E712
            or_(
                Availability.reserved_request_id.is_(None),
                Availability.reserved_request_id == req.id,
            )
        )
        .order_by(Availability.start_time.asc())
        .all()
    )

    return [
        {
            "id": s.id,
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "timezone": s.timezone,
            "reserved_request_id": s.reserved_request_id,  # optional but helpful for debugging
        }
        for s in slots
    ], 200

@sessions_bp.post("")
@jwt_required()
def create_session_request():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    skill_id = data.get("skill_id")
    message = (data.get("message") or "").strip()

    if not skill_id:
        return {"error": "skill_id is required."}, 400

    # Optional safety: prevent massive payloads / abuse
    if len(message) > 500:
        return {"error": "Message is too long (max 500 characters)."}, 400

    skill = Skill.query.get(int(skill_id))
    if not skill:
        return {"error": "Skill not found."}, 404

    # ✅ Guardrail #1: prevent requesting your own skill
    if int(skill.user_id) == user_id:
        return {"error": "You cannot request your own skill."}, 400

    # ✅ Guardrail #2: prevent requesting private skills you don't own
    # (Assumes your Skill model uses is_public boolean)
    # If your field is named differently, change `skill.is_public` accordingly.
    if hasattr(skill, "is_public") and (not skill.is_public):
        return {"error": "That skill is private and cannot be requested."}, 403

    # ✅ Guardrail #3: prevent duplicate active requests (pending/accepted) for the same skill
    existing = (
        SessionRequest.query
        .filter(
            SessionRequest.requester_id == user_id,
            SessionRequest.skill_id == skill.id,
            SessionRequest.status.in_(["pending", "accepted"])
        )
        .first()
    )
    if existing:
        return {
            "error": "You already have an active request for this skill.",
            "existing_request_id": existing.id,
            "existing_status": existing.status
        }, 409

    # Create request
    req = SessionRequest(
        requester_id=user_id,
        provider_id=int(skill.user_id),
        skill_id=skill.id,
        message=message or None,
        status="pending",
        schedule_status="none",
        created_at=datetime.utcnow(),
    )

    db.session.add(req)

    notify(
        user_id=req.provider_id,
        ntype="session_requested",
        title="New session request",
        body=f"You received a request for '{skill.title}'.",
        session_request_id=req.id,
        skill_id=req.skill_id,
    )

    db.session.commit()

    return {
        "id": req.id,
        "status": req.status,
        "schedule_status": req.schedule_status,
        "created_at": req.created_at.isoformat(),
    }, 201

@sessions_bp.get("/mine")
@jwt_required()
def my_sessions():
    user_id = int(get_jwt_identity())

    reqs = (
        SessionRequest.query
        .filter(
            or_(
                SessionRequest.requester_id == user_id,
                SessionRequest.provider_id == user_id,
            )
        )
        .order_by(SessionRequest.created_at.desc())
        .all()
    )

    # optional: load skills for titles
    skill_ids = list({r.skill_id for r in reqs})
    skills = Skill.query.filter(Skill.id.in_(skill_ids)).all() if skill_ids else []
    skill_map = {s.id: s for s in skills}

    def serialize(r: SessionRequest):
        s = skill_map.get(r.skill_id)
        return {
            "id": r.id,
            "skill_id": r.skill_id,
            "skill_title": s.title if s else None,
            "requester_id": r.requester_id,
            "provider_id": r.provider_id,
            "message": r.message,
            "status": r.status,
            "schedule_status": r.schedule_status,
            "scheduled_start": r.scheduled_start.isoformat() if r.scheduled_start else None,
            "scheduled_end": r.scheduled_end.isoformat() if r.scheduled_end else None,
            "timezone": r.timezone,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "responded_at": r.responded_at.isoformat() if r.responded_at else None,
        }

    made = []
    received = []
    for r in reqs:
        item = serialize(r)
        if r.requester_id == user_id:
            made.append(item)
        else:
            received.append(item)

    return {"made": made, "received": received}, 200
