from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from ..extensions import db
from ..models.review import Review
from ..models.session_request import SessionRequest

reviews_bp = Blueprint("reviews", __name__, url_prefix="/reviews")


def is_admin():
    return (get_jwt() or {}).get("role") == "admin"


@reviews_bp.get("/session/<int:session_id>")
@jwt_required()
def list_reviews_for_session(session_id):
    user_id = int(get_jwt_identity())

    sr = SessionRequest.query.get(session_id)
    if not sr:
        return {"error": "Session request not found."}, 404

    # Only participants/admin can view
    if not (is_admin() or user_id in (sr.requester_id, sr.provider_id)):
        return {"error": "Not authorized."}, 403

    reviews = (
        Review.query
        .filter_by(session_request_id=session_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return [
        {
            "id": r.id,
            "session_request_id": r.session_request_id,
            "from_user_id": r.from_user_id,
            "to_user_id": r.to_user_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
        }
        for r in reviews
    ], 200


@reviews_bp.post("")
@jwt_required()
def create_review():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    session_request_id = data.get("session_request_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip() or None

    if not session_request_id:
        return {"error": "session_request_id is required."}, 400

    try:
        rating = int(rating)
    except Exception:
        return {"error": "rating must be an integer 1–5."}, 400

    if rating < 1 or rating > 5:
        return {"error": "rating must be between 1 and 5."}, 400

    sr = SessionRequest.query.get(int(session_request_id))
    if not sr:
        return {"error": "Session request not found."}, 404

    # must be participant/admin
    if not (is_admin() or user_id in (sr.requester_id, sr.provider_id)):
        return {"error": "Not authorized."}, 403

    # Only allow feedback when completed (this matches your UI)
    if sr.status != "completed":
        return {"error": "Feedback is only allowed after the session is completed."}, 400

    # determine who receives the review
    if user_id == sr.requester_id:
        to_user_id = sr.provider_id
    else:
        to_user_id = sr.requester_id

    # upsert (so re-submits don't crash)
    existing = Review.query.filter_by(
        session_request_id=sr.id,
        from_user_id=user_id
    ).first()

    if existing:
        existing.rating = rating
        existing.comment = comment
        db.session.commit()
        return {"message": "Review updated."}, 200

    rev = Review(
        session_request_id=sr.id,
        from_user_id=user_id,
        to_user_id=to_user_id,
        rating=rating,
        comment=comment,
    )
    db.session.add(rev)
    db.session.commit()
    return {"message": "Review created."}, 201
