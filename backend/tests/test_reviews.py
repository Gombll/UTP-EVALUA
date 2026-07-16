from app import create_app
from app.config.settings import TestConfig
from app.database.seed import seed_database
from app.extensions import db
from app.models import Career, Faculty, Review, Teacher, User


def _auth_headers(client, correo: str, password: str) -> dict:
    auth = client.post("/api/auth/login", json={"correo": correo, "password": password})
    token = auth.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _register_student(client, correo: str = "nuevo@test.com") -> dict:
    response = client.post(
        "/api/auth/register",
        json={"nombres": "Nuevo Alumno", "correo": correo, "password": "Secret123*"},
    )
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _app_client():
    app = create_app(TestConfig)
    client = app.test_client()
    with app.app_context():
        db.create_all()
        seed_database()
    return app, client


def test_duplicate_review_updates_existing_review():
    app, client = _app_client()
    headers = _register_student(client)

    payload = {
        "docente_id": 1,
        "calificacion": 4,
        "comentario": "Explica bien y deja ejemplos utiles.",
    }
    first = client.post("/api/resenas", json=payload, headers=headers)
    second = client.post(
        "/api/resenas",
        json=payload | {"calificacion": 2, "comentario": "Actualizo mi evaluacion con mas detalle."},
        headers=headers,
    )

    with app.app_context():
        student = User.query.filter_by(correo="nuevo@test.com").first()
        reviews = Review.query.filter_by(docente_id=1, estudiante_id=student.id).all()

    assert first.status_code == 201
    assert second.status_code == 201
    assert len(reviews) == 1
    assert second.get_json()["calificacion"] == 2


def test_review_rate_limit_blocks_fourth_new_review_in_one_hour():
    app, client = _app_client()
    headers = _register_student(client)

    with app.app_context():
        faculty = Faculty.query.first()
        career = Career.query.first()
        teacher = Teacher(
            nombres="Profesor",
            apellidos="Extra",
            correo="extra@utp.edu.pe",
            facultad_id=faculty.id,
            carrera_id=career.id,
        )
        db.session.add(teacher)
        db.session.commit()
        fourth_teacher_id = teacher.id

    for teacher_id in [1, 2, 3]:
        response = client.post(
            "/api/resenas",
            json={
                "docente_id": teacher_id,
                "calificacion": 5,
                "comentario": f"Comentario valido para docente {teacher_id}.",
            },
            headers=headers,
        )
        assert response.status_code == 201

    blocked = client.post(
        "/api/resenas",
        json={
            "docente_id": fourth_teacher_id,
            "calificacion": 4,
            "comentario": "Comentario valido para intentar superar el limite.",
        },
        headers=headers,
    )

    assert blocked.status_code == 400
    assert "limite de 3 resenas por hora" in blocked.get_json()["message"]


def test_reported_review_is_hidden_from_public_dashboard_until_approved():
    app, client = _app_client()
    student_headers = _register_student(client)
    admin_headers = _auth_headers(client, "admin@utp.edu.pe", "Admin123*")

    created = client.post(
        "/api/resenas",
        json={
            "docente_id": 1,
            "calificacion": 5,
            "comentario": "Clase clara con ejercicios utiles y buen ritmo.",
        },
        headers=student_headers,
    ).get_json()

    report = client.post(
        f"/api/resenas/{created['id']}/reportar",
        json={"motivo": "Contenido dudoso"},
        headers=student_headers,
    )
    dashboard = client.get("/api/dashboard", headers=student_headers).get_json()
    moderation = client.get("/api/resenas?estado=reportada", headers=admin_headers).get_json()

    approve = client.post(
        f"/api/resenas/{created['id']}/moderar",
        json={"accion": "aprobar"},
        headers=admin_headers,
    )

    assert report.status_code == 200
    assert created["id"] not in [review["id"] for review in dashboard["ultimas_resenas"]]
    assert created["id"] in [review["id"] for review in moderation["items"]]
    assert approve.status_code == 200
    assert approve.get_json()["estado"] == "visible"
