from functools import reduce

from app.models import Review, Role, Teacher, User
from app.models.review import ReviewStatus


class DashboardService:
    def summary(self) -> dict:
        reviews = Review.query.filter_by(estado=ReviewStatus.VISIBLE).all()
        ratings = list(map(lambda review: review.calificacion, reviews))
        total_rating = reduce(lambda total, value: total + value, ratings, 0)
        average = round(total_rating / len(ratings), 2) if ratings else 0.0

        teachers = Teacher.query.all()
        ranked = sorted(
            filter(lambda teacher: len(teacher.reviews) > 0, teachers),
            key=lambda teacher: teacher.promedio,
            reverse=True,
        )

        return {
            "cantidad_docentes": Teacher.query.count(),
            "cantidad_estudiantes": User.query.filter_by(role=Role.STUDENT).count(),
            "cantidad_resenas": Review.query.filter_by(estado=ReviewStatus.VISIBLE).count(),
            "promedio_general": average,
            "top_docentes": [teacher.to_dict() for teacher in ranked[:10]],
            "ultimas_resenas": [
                review.to_dict()
                for review in Review.query.filter_by(estado=ReviewStatus.VISIBLE)
                .order_by(Review.fecha.desc())
                .limit(10)
                .all()
            ],
        }
