import os

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-fallback-key")

    # Do NOT leave this empty; SQLAlchemy must always get a valid URL string.
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///instance/skillswap.db")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-fallback")
    CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
    # JWT in HttpOnly cookies (so the browser automatically sends it)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_COOKIE_SECURE = False          # True in production (HTTPS)
    JWT_COOKIE_SAMESITE = "Lax"        # works well for localhost dev
    JWT_SESSION_COOKIE = True          # cookie expires when browser closes
    JWT_COOKIE_CSRF_PROTECT = False    # we'll enable later once everything works

