from app.models import Career
from app.repositories.base_repository import BaseRepository


class CareerRepository(BaseRepository[Career]):
    searchable_fields = ("nombre",)

    def __init__(self) -> None:
        super().__init__(Career)
