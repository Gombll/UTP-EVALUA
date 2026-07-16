from app.repositories import TeacherRepository
from app.services.base_service import BaseService
from app.utils.validators import require_fields


class TeacherService(BaseService):
    def __init__(self) -> None:
        super().__init__(TeacherRepository())

    def list(self, **kwargs) -> dict:
        filters = kwargs.pop("filters", {})
        for key in ["facultad_id", "carrera_id"]:
            if key in kwargs:
                filters[key] = kwargs.pop(key)
        return super().list(filters=filters, **kwargs)

    def create(self, data: dict) -> dict:
        require_fields(
            data,
            ["nombres", "apellidos", "correo", "facultad_id", "carrera_id"],
        )
        return super().create(data)
