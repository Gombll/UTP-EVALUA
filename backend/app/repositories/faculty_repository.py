from app.models import Faculty
from app.repositories.base_repository import BaseRepository


class FacultyRepository(BaseRepository[Faculty]):
    searchable_fields = ("nombre",)

    def __init__(self) -> None:
        super().__init__(Faculty)
