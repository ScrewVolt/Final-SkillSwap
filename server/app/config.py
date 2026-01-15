import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-fallback-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///instance/skillswap.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-fallback")
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")

    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_COOKIE_CSRF_PROTECT = False

    # --- Detect prod on Render ---
    IS_PROD = os.getenv("RENDER") == "true" or os.getenv("FLASK_ENV") == "production"

    JWT_COOKIE_SECURE = IS_PROD          # ✅ True on Render
    JWT_COOKIE_SAMESITE = "None" if IS_PROD else "Lax"
    JWT_SESSION_COOKIE = True
