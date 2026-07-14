from flask_sqlalchemy import SQLAlchemy
from datetime import datetime


db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(20), nullable=False)


class Career(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    courses = db.relationship("Course", backref="career", lazy=True)


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    career_id = db.Column(db.Integer, db.ForeignKey("career.id"), nullable=False)
    teachers = db.relationship("Teacher", backref="course", lazy=True)


class Teacher(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    specialty = db.Column(db.String(120), nullable=False, default="Docente")
    biography = db.Column(db.Text, nullable=True)
    course_id = db.Column(db.Integer, db.ForeignKey("course.id"), nullable=False)
    reviews = db.relationship("Review", backref="teacher", lazy=True)

    def average_rating(self):
        if not self.reviews:
            return 0.0
        return round(sum(review.rating for review in self.reviews) / len(self.reviews), 1)


class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(120), nullable=False)
    comment = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teacher.id"), nullable=False)


def init_db():
    db.create_all()
    if not User.query.first():
        admin = User(username="admin", password="admin123", role="admin")
        student = User(username="alumno", password="alumno123", role="alumno")
        db.session.add_all([admin, student])
        db.session.commit()

    if not Career.query.first():
        sistemas = Career(name="Ingeniería de Sistemas")
        administracion = Career(name="Administración")
        diseno = Career(name="Diseño y Talleres")
        db.session.add_all([sistemas, administracion, diseno])
        db.session.commit()

        curso_bd = Course(name="Bases de Datos", career=sistemas)
        curso_prog = Course(name="Programación", career=sistemas)
        curso_conta = Course(name="Contabilidad", career=administracion)
        curso_taller = Course(name="Taller de Robótica", career=diseno)
        db.session.add_all([curso_bd, curso_prog, curso_conta, curso_taller])
        db.session.commit()

        teachers = [
            Teacher(name="Dra. Carla Paredes", specialty="Bases de Datos", biography="Docente experta en SQL y análisis de datos.", course=curso_bd),
            Teacher(name="Mtro. Luis Gómez", specialty="Programación", biography="Profesional en desarrollo de software y metodologías ágiles.", course=curso_prog),
            Teacher(name="Ing. Ana Salazar", specialty="Contabilidad", biography="Especialista en finanzas y auditoría empresarial.", course=curso_conta),
            Teacher(name="Prof. Javier Ruiz", specialty="Robótica", biography="Formador en talleres prácticos e innovación tecnológica.", course=curso_taller),
        ]
        db.session.add_all(teachers)
        db.session.commit()
