from app.extensions import db
from app.models import Career, Course, Faculty, Review, Role, Teacher, User


def seed_database() -> None:
    engineering = _get_or_create(Faculty, nombre="Ingenieria")
    business = _get_or_create(Faculty, nombre="Gestion y Negocios")
    db.session.flush()

    software = _get_or_create(
        Career,
        nombre="Ingenieria de Software",
        facultad_id=engineering.id,
    )
    systems = _get_or_create(
        Career,
        nombre="Ingenieria de Sistemas",
        facultad_id=engineering.id,
    )
    administration = _get_or_create(
        Career,
        nombre="Administracion",
        facultad_id=business.id,
    )
    db.session.flush()

    _get_or_create(
        Course,
        nombre="Arquitectura y Diseno de Software",
        defaults={"codigo": "100000I101", "creditos": 4, "carrera_id": software.id},
    )
    _get_or_create(
        Course,
        nombre="Pruebas y Calidad de Software",
        defaults={"codigo": "100000I102", "creditos": 3, "carrera_id": software.id},
    )
    _get_or_create(
        Course,
        nombre="Bases de Datos Avanzadas",
        defaults={"codigo": "100000I201", "creditos": 4, "carrera_id": systems.id},
    )
    _get_or_create(
        Course,
        nombre="Inteligencia de Negocios y Big Data",
        defaults={"codigo": "100000I202", "creditos": 4, "carrera_id": systems.id},
    )
    _get_or_create(
        Course,
        nombre="Gestion Estrategica y Finanzas",
        defaults={"codigo": "100000G301", "creditos": 3, "carrera_id": administration.id},
    )
    db.session.flush()

    teachers = [
        _get_or_create(
            Teacher,
            correo="ana.torres@utp.edu.pe",
            defaults={
                "nombres": "Ana",
                "apellidos": "Torres Rojas",
                "facultad_id": engineering.id,
                "carrera_id": software.id,
                "fotografia": "https://i.pravatar.cc/160?img=47",
            },
        ),
        _get_or_create(
            Teacher,
            correo="luis.castillo@utp.edu.pe",
            defaults={
                "nombres": "Luis",
                "apellidos": "Castillo Vega",
                "facultad_id": engineering.id,
                "carrera_id": systems.id,
                "fotografia": "https://i.pravatar.cc/160?img=12",
            },
        ),
        _get_or_create(
            Teacher,
            correo="mariela.soto@utp.edu.pe",
            defaults={
                "nombres": "Mariela",
                "apellidos": "Soto Paredes",
                "facultad_id": business.id,
                "carrera_id": administration.id,
                "fotografia": "https://i.pravatar.cc/160?img=32",
            },
        ),
    ]
    db.session.flush()

    admin = _ensure_user(
        nombres="Administrador UTP",
        correo="admin@utp.edu.pe",
        password="Admin123*",
        role=Role.ADMIN,
    )
    student = _ensure_user(
        nombres="Estudiante Demo",
        correo="estudiante@utp.edu.pe",
        password="Estudiante123*",
        role=Role.STUDENT,
    )
    db.session.flush()

    if not Review.query.first():
        reviews = [
            Review(docente_id=teachers[0].id, estudiante_id=student.id, calificacion=5, comentario="Explica con claridad y propone retos utiles."),
            Review(docente_id=teachers[1].id, estudiante_id=student.id, calificacion=4, comentario="Buen dominio de la carrera y feedback rapido."),
            Review(docente_id=teachers[2].id, estudiante_id=student.id, calificacion=3, comentario="La clase es ordenada, pero podria ser mas dinamica."),
        ]
        db.session.add_all(reviews)

    db.session.commit()


def _get_or_create(model, defaults: dict | None = None, **lookup):
    entity = model.query.filter_by(**lookup).first()
    if entity:
        return entity
    data = lookup | (defaults or {})
    entity = model(**data)
    db.session.add(entity)
    return entity


def _ensure_user(nombres: str, correo: str, password: str, role: str) -> User:
    user = User.query.filter_by(correo=correo).first()
    if not user:
        user = User(nombres=nombres, correo=correo, role=role, active=True)
        user.password = password
        db.session.add(user)
        return user

    user.nombres = nombres
    user.role = role
    user.active = True
    user.password = password
    return user
