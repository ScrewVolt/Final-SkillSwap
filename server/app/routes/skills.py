from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..extensions import db
from ..models.skill import Skill

skills_bp = Blueprint("skills", __name__)

def is_admin():
    return (get_jwt() or {}).get("role") == "admin"

@skills_bp.post("")
@jwt_required()
def create_skill():
    data = request.get_json() or {}
    user_id = int(get_jwt_identity())

    skill_type = (data.get("type") or "").strip().lower()
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    tags = (data.get("tags") or "").strip()
    visibility = (data.get("visibility") or "public").strip().lower()

    if skill_type not in ("offer", "seek"):
        return {"error": "type must be 'offer' or 'seek'."}, 400
    if not title:
        return {"error": "title is required."}, 400
    if visibility not in ("public", "private"):
        return {"error": "visibility must be 'public' or 'private'."}, 400

    s = Skill(
        user_id=user_id,
        type=skill_type,
        title=title,
        description=description,
        tags=tags,
        visibility=visibility,
    )
    db.session.add(s)
    db.session.commit()
    return {"id": s.id, "message": "Skill created."}, 201


@skills_bp.get("")
@jwt_required(optional=True)
def list_skills():
    # Existing params (keep)
    q = (request.args.get("q") or "").strip().lower()
    skill_type = (request.args.get("type") or "").strip().lower()
    user_id_filter = request.args.get("userId")
    include_private = (request.args.get("includePrivate") or "false").lower() == "true"

    # NEW: pagination params
    try:
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 12))
    except ValueError:
        return {"error": "Invalid pagination params."}, 400

    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)  # cap for safety

    # Determine current user (keep)
    current_user_id = None
    try:
        ident = get_jwt_identity()
        current_user_id = int(ident) if ident is not None else None
    except:
        current_user_id = None

    query = Skill.query

    # Filters (keep)
    if user_id_filter:
        query = query.filter(Skill.user_id == int(user_id_filter))

    if skill_type in ("offer", "seek"):
        query = query.filter(Skill.type == skill_type)

    # Visibility enforcement (keep your rules)
    if include_private:
        if not (is_admin() or (user_id_filter and current_user_id == int(user_id_filter))):
            return {"error": "Not allowed to include private skills."}, 403
        # if allowed, do NOT filter by public only
    else:
        query = query.filter(Skill.visibility == "public")

    # Search (keep)
    if q:
        like = f"%{q}%"
        query = query.filter(
            Skill.title.ilike(like) |
            Skill.description.ilike(like) |
            Skill.tags.ilike(like)
        )

    # Sorting
    query = query.order_by(Skill.created_at.desc())

    # NEW: total count BEFORE pagination
    total = query.count()
    total_pages = (total + page_size - 1) // page_size

    # NEW: apply pagination
    skills = query.offset((page - 1) * page_size).limit(page_size).all()

    # NEW: consistent response shape for frontend
    return {
        "data": [{
            "id": s.id,
            "user_id": s.user_id,
            "type": s.type,
            "title": s.title,
            "description": s.description,
            "tags": s.tags,
            "visibility": s.visibility,
            "created_at": s.created_at.isoformat()
        } for s in skills],
        "meta": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages
        }
    }, 200


@skills_bp.delete("/<int:skill_id>")
@jwt_required()
def delete_skill(skill_id):
    current_user_id = int(get_jwt_identity())
    s = Skill.query.get(skill_id)
    if not s:
        return {"error": "Skill not found."}, 404

    if not (is_admin() or s.user_id == current_user_id):
        return {"error": "Not authorized."}, 403

    db.session.delete(s)
    db.session.commit()
    return {"message": "Skill deleted."}, 200

