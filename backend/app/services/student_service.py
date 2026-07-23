from app.models import Role, User
from app.repositories import UserRepository
from app.services.base_service import BaseService
from app.utils.pagination import paginate_response
from app.utils.validators import require_fields, validate_password, validate_person_name, validate_utp_email


class StudentService(BaseService):
    def __init__(self) -> None:
        super().__init__(UserRepository())

    def list(self, **kwargs) -> dict:
        pagination = self.repository.students(**kwargs)
        return paginate_response(pagination)

    def create(self, data: dict) -> dict:
        require_fields(data, ["nombres", "correo", "password"])
        nombres = validate_person_name(data["nombres"])
        correo = validate_utp_email(data["correo"])
        validate_password(data["password"])
        user = User(nombres=nombres, correo=correo, role=Role.STUDENT)
        user.password = data["password"]
        return self.repository.create(
            {
                "nombres": user.nombres,
                "correo": user.correo,
                "password_hash": user.password_hash,
                "role": user.role,
                "active": data.get("active", True),
            }
        ).to_dict()

    def update(self, entity_id: int, data: dict) -> dict:
        if data.get("nombres"):
            data["nombres"] = validate_person_name(data["nombres"])
        if data.get("correo"):
            data["correo"] = validate_utp_email(data["correo"])
        if data.get("password"):
            user = User(nombres=data.get("nombres", "tmp"), correo=data.get("correo", "tmp"))
            validate_password(data["password"])
            user.password = data.pop("password")
            data["password_hash"] = user.password_hash
        return super().update(entity_id, data)
