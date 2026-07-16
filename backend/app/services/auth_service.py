from flask_jwt_extended import create_access_token
from werkzeug.exceptions import BadRequest, Unauthorized

from app.models import Role, User
from app.repositories import UserRepository
from app.utils.validators import require_fields, validate_email, validate_password, validate_person_name


class AuthService:
    def __init__(self, users: UserRepository | None = None) -> None:
        self.users = users or UserRepository()

    def register(self, data: dict) -> dict:
        require_fields(data, ["nombres", "correo", "password"])
        nombres = validate_person_name(data["nombres"])
        correo = validate_email(data["correo"])
        validate_password(data["password"])
        if self.users.find_by_email(correo):
            raise BadRequest("El correo ya está registrado.")

        raw_role = str(data.get("role", "")).lower()
        role = Role.ADMIN if raw_role in ["admin", "administrador"] else Role.STUDENT

        user = User(
            nombres=nombres,
            correo=correo,
            role=role,
        )
        user.password = data["password"]
        created = self.users.create(
            {
                "nombres": user.nombres,
                "correo": user.correo,
                "password_hash": user.password_hash,
                "role": user.role,
                "active": True,
            }
        )
        return self._token_response(created)

    def login(self, data: dict) -> dict:
        require_fields(data, ["correo", "password"])
        user = self.users.find_by_email(validate_email(data["correo"]))
        if not user or not user.verify_password(data["password"]):
            raise Unauthorized("Credenciales inválidas.")
        if not user.active:
            raise Unauthorized("Usuario inactivo.")
        return self._token_response(user)

    def _token_response(self, user: User) -> dict:
        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role, "correo": user.correo},
        )
        return {"access_token": token, "user": user.to_dict()}
