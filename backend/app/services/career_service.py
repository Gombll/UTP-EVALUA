from app.repositories import CareerRepository
from app.services.base_service import BaseService
from app.utils.validators import require_fields


class CareerService(BaseService):
    def __init__(self) -> None:
        super().__init__(CareerRepository())

    def list(self, **kwargs) -> dict:
        filters = kwargs.pop("filters", {})
        if "facultad_id" in kwargs:
            filters["facultad_id"] = kwargs.pop("facultad_id")
        return super().list(filters=filters, **kwargs)

    def create(self, data: dict) -> dict:
        require_fields(data, ["nombre", "facultad_id"])
        return super().create(data)
