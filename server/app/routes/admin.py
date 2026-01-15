from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import func, or_

from ..extensions import db
from ..models.user import User
from ..models.skill import Skill
from ..models.session_request import SessionRequest
from ..models.notification import Notification

admin_bp = Blueprint("admin", __name__)

ALLOWED_ROLES = {"admin", "student"}
ALLOWED_SESSION_STATUS = {"pending", "accepted", "declined", "cancelled", "completed"}
ALLOWED_SCHEDULE_STATUS = {"none", "proposed", "confirmed"}


# ----------------------------
# helpers
# ----------------------------
def is_admin() -> bool:
    return (get_jwt() or {}).get("role") == "admin"


def require_admin():
    if not is_admin():
        return {"error": "Admin only."}, 403
    return None


def clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def parse_pagination(default_size: int = 20, max_size: int = 50):
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", default_size))
    except ValueError:
        return None, None, ({"error": "Invalid pagination params."}, 400)

    page = max(page, 1)
    page_size = clamp(page_size, 1, max_size)
    return page, page_size, None


def iso(dt):
    return dt.isoformat() if dt else None


def to_meta(page: int, page_size: int, total: int):
    total_pages = (total + page_size - 1) // page_size
    return {"page": page, "pageSize": page_size, "total": total, "totalPages": total_pages}


# ----------------------------
# REPORTS
# ----------------------------
@admin_bp.get("/reports")
@jwt_required()
def reports():
    denied = require_admin()
    if denied:
        return denied

    total_users = db.session.query(func.count(User.id)).scalar() or 0
    total_skills = db.session.query(func.count(Skill.id)).scalar() or 0

    # skills by visibility
    public_skills = (
        db.session.query(func.count(Skill.id))
        .filter(Skill.visibility == "public")
        .scalar()
        or 0
    )
    private_skills = (
        db.session.query(func.count(Skill.id))
        .filter(Skill.visibility == "private")
        .scalar()
        or 0
    )

    # skills by type
    offers = (
        db.session.query(func.count(Skill.id))
        .filter(Skill.type == "offer")
        .scalar()
        or 0
    )
    seeks = (
        db.session.query(func.count(Skill.id))
        .filter(Skill.type == "seek")
        .scalar()
        or 0
    )

    total_requests = db.session.query(func.count(SessionRequest.id)).scalar() or 0

    by_status_rows = (
        db.session.query(SessionRequest.status, func.count(SessionRequest.id))
        .group_by(SessionRequest.status)
        .all()
    )
    sessions_by_status = {status: count for status, count in by_status_rows}

    unread_notifications = (
        db.session.query(func.count(Notification.id))
        .filter(Notification.is_read.is_(False))
        .scalar()
        or 0
    )

    # Top tags (comma-separated)
    tag_counts = {}
    rows = db.session.query(Skill.tags).filter(Skill.tags.isnot(None)).all()
    for (tags,) in rows:
        for t in str(tags).split(","):
            t = t.strip().lower()
            if t:
                tag_counts[t] = tag_counts.get(t, 0) + 1

    top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "kpis": {
            "totalUsers": total_users,
            "totalSkills": total_skills,
            "publicSkills": public_skills,
            "privateSkills": private_skills,
            "offers": offers,
            "seeks": seeks,
            "totalSessionRequests": total_requests,
            "unreadNotifications": unread_notifications,
        },
        "sessionsByStatus": sessions_by_status,
        "topTags": [{"tag": t, "count": c} for t, c in top_tags],
    }, 200


# ----------------------------
# ADMIN: SKILLS MODERATION
# ----------------------------
@admin_bp.get("/skills")
@jwt_required()
def admin_list_skills():
    denied = require_admin()
    if denied:
        return denied

    q = (request.args.get("q") or "").strip()
    skill_type = (request.args.get("type") or "").strip().lower()

    page, page_size, err = parse_pagination(default_size=20)
    if err:
        return err

    query = Skill.query

    if skill_type in ("offer", "seek"):
        query = query.filter(Skill.type == skill_type)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                Skill.title.ilike(like),
                Skill.description.ilike(like),
                Skill.tags.ilike(like),
            )
        )

    query = query.order_by(Skill.created_at.desc())

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    # include user info for moderation clarity
    user_ids = list({s.user_id for s in rows})
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {u.id: {"name": u.name, "email": u.email} for u in users}

    return {
        "data": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "user": user_map.get(s.user_id),
                "type": s.type,
                "title": s.title,
                "description": s.description,
                "tags": s.tags,
                "visibility": s.visibility,
                "created_at": iso(s.created_at),
            }
            for s in rows
        ],
        "meta": to_meta(page, page_size, total),
    }, 200


@admin_bp.delete("/skills/<int:skill_id>")
@jwt_required()
def admin_delete_skill(skill_id: int):
    denied = require_admin()
    if denied:
        return denied

    s = Skill.query.get(skill_id)
    if not s:
        return {"error": "Skill not found."}, 404

    db.session.delete(s)
    db.session.commit()
    return {"message": "Skill removed by admin."}, 200


# ----------------------------
# ADMIN: USERS
# ----------------------------
@admin_bp.get("/users")
@jwt_required()
def admin_list_users():
    denied = require_admin()
    if denied:
        return denied

    q = (request.args.get("q") or "").strip()
    role = (request.args.get("role") or "").strip().lower()

    # optional: includeInactive=true to show only inactive, etc (easy to expand later)
    include_inactive = (request.args.get("includeInactive") or "true").lower() == "true"

    page, page_size, err = parse_pagination(default_size=20)
    if err:
        return err

    query = User.query

    if role in ALLOWED_ROLES:
        query = query.filter(User.role == role)

    if not include_inactive and hasattr(User, "is_active"):
        query = query.filter(User.is_active.is_(True))

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                User.name.ilike(like),
                User.email.ilike(like),
                func.cast(User.id, db.String).ilike(like),
            )
        )

    query = query.order_by(User.created_at.desc())

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "data": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "is_active": bool(getattr(u, "is_active", True)),
                "created_at": iso(u.created_at),
            }
            for u in rows
        ],
        "meta": to_meta(page, page_size, total),
    }, 200


@admin_bp.patch("/users/<int:user_id>/role")
@jwt_required()
def admin_set_user_role(user_id: int):
    denied = require_admin()
    if denied:
        return denied

    data = request.get_json() or {}
    new_role = (data.get("role") or "").strip().lower()

    if new_role not in ALLOWED_ROLES:
        return {"error": "role must be 'admin' or 'student'."}, 400

    u = User.query.get(user_id)
    if not u:
        return {"error": "User not found."}, 404

    u.role = new_role
    db.session.commit()
    return {"message": "Role updated.", "id": u.id, "role": u.role}, 200


@admin_bp.patch("/users/<int:user_id>/active")
@jwt_required()
def admin_set_user_active(user_id: int):
    denied = require_admin()
    if denied:
        return denied

    data = request.get_json() or {}
    is_active = data.get("is_active")

    if not isinstance(is_active, bool):
        return {"error": "is_active must be boolean."}, 400

    u = User.query.get(user_id)
    if not u:
        return {"error": "User not found."}, 404

    # if the column exists
    if not hasattr(u, "is_active"):
        return {"error": "User model does not support is_active yet."}, 400

    u.is_active = is_active
    db.session.commit()
    return {"message": "User updated.", "id": u.id, "is_active": bool(u.is_active)}, 200


# ----------------------------
# ADMIN: SESSIONS
# ----------------------------
@admin_bp.get("/sessions")
@jwt_required()
def admin_list_sessions():
    denied = require_admin()
    if denied:
        return denied

    q = (request.args.get("q") or "").strip()
    status = (request.args.get("status") or "").strip().lower()
    schedule_status = (request.args.get("scheduleStatus") or "").strip().lower()

    page, page_size, err = parse_pagination(default_size=20)
    if err:
        return err

    query = SessionRequest.query

    if status in ALLOWED_SESSION_STATUS:
        query = query.filter(SessionRequest.status == status)

    if schedule_status in ALLOWED_SCHEDULE_STATUS:
        query = query.filter(SessionRequest.schedule_status == schedule_status)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                SessionRequest.message.ilike(like),
                func.cast(SessionRequest.id, db.String).ilike(like),
                func.cast(SessionRequest.requester_id, db.String).ilike(like),
                func.cast(SessionRequest.provider_id, db.String).ilike(like),
                func.cast(SessionRequest.skill_id, db.String).ilike(like),
            )
        )

    query = query.order_by(SessionRequest.created_at.desc())

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    # Attach lightweight user + skill info
    user_ids = set()
    skill_ids = set()
    for r in rows:
        user_ids.add(r.requester_id)
        user_ids.add(r.provider_id)
        skill_ids.add(r.skill_id)

    users = User.query.filter(User.id.in_(list(user_ids))).all() if user_ids else []
    user_map = {u.id: {"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users}

    skills = Skill.query.filter(Skill.id.in_(list(skill_ids))).all() if skill_ids else []
    skill_map = {s.id: {"id": s.id, "title": s.title, "type": s.type, "visibility": s.visibility} for s in skills}

    return {
        "data": [
            {
                "id": r.id,
                "requester_id": r.requester_id,
                "provider_id": r.provider_id,
                "skill_id": r.skill_id,
                "message": r.message,
                "status": r.status,
                "schedule_status": r.schedule_status,
                "scheduled_start": iso(r.scheduled_start),
                "scheduled_end": iso(r.scheduled_end),
                "timezone": r.timezone,
                "created_at": iso(r.created_at),
                "responded_at": iso(r.responded_at),
                "requester": user_map.get(r.requester_id),
                "provider": user_map.get(r.provider_id),
                "skill": skill_map.get(r.skill_id),
            }
            for r in rows
        ],
        "meta": to_meta(page, page_size, total),
    }, 200


@admin_bp.patch("/sessions/<int:request_id>/status")
@jwt_required()
def admin_set_session_status(request_id: int):
    denied = require_admin()
    if denied:
        return denied

    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()

    if new_status not in ALLOWED_SESSION_STATUS:
        return {"error": "Invalid status."}, 400

    r = SessionRequest.query.get(request_id)
    if not r:
        return {"error": "Session request not found."}, 404

    r.status = new_status
    r.responded_at = datetime.utcnow()
    db.session.commit()

    return {"message": "Status updated.", "id": r.id, "status": r.status}, 200
