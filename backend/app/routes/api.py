from app.controllers.auth_controller import ns as auth_ns
from app.controllers.career_controller import ns as career_ns
from app.controllers.course_controller import ns as course_ns
from app.controllers.dashboard_controller import ns as dashboard_ns
from app.controllers.faculty_controller import ns as faculty_ns
from app.controllers.recommendation_controller import ns as recommendation_ns
from app.controllers.report_controller import ns as report_ns
from app.controllers.review_controller import ns as review_ns
from app.controllers.student_controller import ns as student_ns
from app.controllers.teacher_controller import ns as teacher_ns


def register_namespaces(api) -> None:
    api.add_namespace(auth_ns)
    api.add_namespace(dashboard_ns)
    api.add_namespace(faculty_ns)
    api.add_namespace(career_ns)
    api.add_namespace(course_ns)
    api.add_namespace(teacher_ns)
    api.add_namespace(student_ns)
    api.add_namespace(review_ns)
    api.add_namespace(recommendation_ns)
    api.add_namespace(report_ns)
