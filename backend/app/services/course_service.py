from app.repositories import CourseRepository
from app.services.base_service import BaseService
from app.utils.validators import require_fields


class CourseService(BaseService):
    def __init__(self) -> None:
        super().__init__(CourseRepository())

    def list(self, **kwargs) -> dict:
        filters = kwargs.pop("filters", {})
        if "carrera_id" in kwargs:
            filters["carrera_id"] = kwargs.pop("carrera_id")
        return super().list(filters=filters, **kwargs)

    def create(self, data: dict) -> dict:
        require_fields(data, ["nombre", "carrera_id"])
        return super().create(data)
