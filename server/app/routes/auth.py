from flask import Blueprint, request, make_response
from flask_jwt_extended import (
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
import bcrypt

from ..extensions import db
from ..models.user import User

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return {"error": "Name, email, and password are required."}, 400

    if User.query.filter_by(email=email).first():
        return {"error": "Email already exists."}, 409

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # default role
    user = User(name=name, email=email, password_hash=hashed, role="student")
    db.session.add(user)
    db.session.commit()

    return {"message": "User registered successfully."}, 201


@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user:
        return {"error": "Invalid credentials."}, 401

    # ✅ block deactivated users here
    if hasattr(user, "is_active") and not user.is_active:
        return {"error": "Account is deactivated. Contact an admin."}, 403

    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return {"error": "Invalid credentials."}, 401

    access_token = create_access_token(
        identity=str(user.id),  # string is fine; you cast to int later
        additional_claims={"role": user.role},
    )

    response = make_response({"message": "Logged in."}, 200)
    set_access_cookies(response, access_token)
    return response


@auth_bp.post("/logout")
def logout():
    response = make_response({"message": "Logged out."}, 200)
    unset_jwt_cookies(response)
    return response


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return {"error": "User not found."}, 404

    # ✅ optional safety net: if they get deactivated after login, they can't keep using the session
    if hasattr(user, "is_active") and not user.is_active:
        return {"error": "Account is deactivated. Contact an admin."}, 403

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "bio": user.bio,
        "is_active": bool(getattr(user, "is_active", True)),
    }, 200
