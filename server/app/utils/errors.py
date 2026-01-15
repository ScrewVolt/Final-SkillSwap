from werkzeug.exceptions import HTTPException

def register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        # e.code = 404/401/403/422 etc.
        return {
            "error": e.name,
            "message": e.description,
            "status": e.code,
        }, e.code

    @app.errorhandler(Exception)
    def handle_unexpected_exception(e):
        # Avoid leaking internal errors to clients in production
        app.logger.exception(e)
        return {
            "error": "Internal Server Error",
            "message": "Something went wrong on the server.",
            "status": 500,
        }, 500
