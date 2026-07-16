from app.models import Teacher
from app.repositories.base_repository import BaseRepository


class TeacherRepository(BaseRepository[Teacher]):
    searchable_fields = ("nombres", "apellidos", "correo")

    def __init__(self) -> None:
        super().__init__(Teacher)
