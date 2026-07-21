from app import create_app
from app.config.settings import TestConfig
from app.database.seed import seed_database
from app.extensions import db
from app.models import Career


def test_courses_crud_operations():
    app = create_app(TestConfig)
    client = app.test_client()

    with app.app_context():
        db.create_all()
        seed_database()

    auth = client.post(
        "/api/auth/login",
        json={"correo": "admin@utp.edu.pe", "password": "Admin123*"},
    ).get_json()
    headers = {"Authorization": f"Bearer {auth['access_token']}"}

    list_response = client.get("/api/cursos", headers=headers)
    assert list_response.status_code == 200
    data = list_response.get_json()
    assert data["total"] >= 5

    with app.app_context():
        career = Career.query.first()
        career_id = career.id

    create_response = client.post(
        "/api/cursos",
        headers=headers,
        json={
            "nombre": "Estructuras de Datos y Algoritmos",
            "codigo": "100000I105",
            "carrera_id": career_id,
        },
    )
    assert create_response.status_code == 201
    created_course = create_response.get_json()
    assert created_course["nombre"] == "Estructuras de Datos y Algoritmos"
    assert created_course["codigo"] == "100000I105"
