from flask import Flask, request
from flask_cors import CORS
from pathlib import Path
from dotenv import load_dotenv

# Load .env before Config
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

from .config import Config
from .extensions import db, migrate, jwt

def create_app():
    # instance_relative_config makes instance_path consistent
    app = Flask(__name__, instance_relative_config=True)
    app.url_map.strict_slashes = False
    app.config.from_object(Config)

    # If using sqlite and path is relative, force an absolute path inside instance/
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if uri.startswith("sqlite:///"):
        # Everything after sqlite:/// is a filesystem path (often relative)
        rel_path = uri.replace("sqlite:///", "", 1)

        # If it's already absolute, leave it; if relative, anchor it to instance_path
        p = Path(rel_path)
        if not p.is_absolute():
            p = Path(app.instance_path) / rel_path

        p.parent.mkdir(parents=True, exist_ok=True)
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{p}"

    CORS(app, supports_credentials=True, origins=[app.config["CORS_ORIGIN"]])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix="/auth")
    from .routes.skills import skills_bp
    app.register_blueprint(skills_bp, url_prefix="/api/skills")
    from .routes.sessions import sessions_bp
    app.register_blueprint(sessions_bp, url_prefix="/sessions")
    from .routes.notifications import notifications_bp
    app.register_blueprint(notifications_bp, url_prefix="/notifications")
    from .routes.availability import availability_bp
    app.register_blueprint(availability_bp, url_prefix="/availability")
    from .routes.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix="/admin")
    from .utils.errors import register_error_handlers
    register_error_handlers(app)
    from .routes.reviews import reviews_bp
    app.register_blueprint(reviews_bp, url_prefix="/reviews")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app
