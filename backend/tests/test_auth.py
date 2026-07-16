from app import create_app
from app.config.settings import TestConfig
from app.extensions import db


def test_register_and_login():
    app = create_app(TestConfig)
    client = app.test_client()

    with app.app_context():
        db.create_all()

    payload = {
        "nombres": "Alumno Test",
        "correo": "alumno@test.com",
        "password": "Secret123*",
    }
    register = client.post("/api/auth/register", json=payload)
    assert register.status_code == 201
    assert "access_token" in register.get_json()

    login = client.post(
        "/api/auth/login",
        json={"correo": payload["correo"], "password": payload["password"]},
    )
    assert login.status_code == 200
    assert login.get_json()["user"]["correo"] == payload["correo"]
