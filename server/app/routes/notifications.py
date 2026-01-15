from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models.notification import Notification

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.get("")
@jwt_required()
def list_notifications():
    user_id = int(get_jwt_identity())

    limit = int(request.args.get("limit", 20))
    limit = max(1, min(limit, 100))

    items = (Notification.query
             .filter_by(user_id=user_id)
             .order_by(Notification.created_at.desc())
             .limit(limit)
             .all())

    return [{
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "session_request_id": n.session_request_id,
        "skill_id": n.skill_id,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat(),
    } for n in items], 200


@notifications_bp.get("/unread-count")
@jwt_required()
def unread_count():
    user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return {"unread": count}, 200


@notifications_bp.post("/<int:notification_id>/read")
@jwt_required()
def mark_read(notification_id):
    user_id = int(get_jwt_identity())

    n = Notification.query.get(notification_id)
    if not n or n.user_id != user_id:
        return {"error": "Not found."}, 404

    n.is_read = True
    db.session.commit()
    return {"message": "Marked read."}, 200


@notifications_bp.post("/read-all")
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return {"message": "All marked read."}, 200
