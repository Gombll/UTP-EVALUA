from functools import wraps

from flask_jwt_extended import get_jwt, verify_jwt_in_request
from werkzeug.exceptions import Forbidden


def role_required(*roles: str):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                raise Forbidden("No tienes permisos para esta accion.")
            return fn(*args, **kwargs)

        return decorator

    return wrapper
