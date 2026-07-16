from app.repositories import FacultyRepository
from app.services.base_service import BaseService
from app.utils.validators import require_fields


class FacultyService(BaseService):
    def __init__(self) -> None:
        super().__init__(FacultyRepository())

    def create(self, data: dict) -> dict:
        require_fields(data, ["nombre"])
        return super().create(data)
