from app import create_app
from app.config.settings import TestConfig
from app.database.seed import seed_database
from app.extensions import db


def test_dashboard_summary_requires_token_and_returns_metrics():
    app = create_app(TestConfig)
    client = app.test_client()

    with app.app_context():
        db.create_all()
        seed_database()

    auth = client.post(
        "/api/auth/login",
        json={"correo": "admin@utp.edu.pe", "password": "Admin123*"},
    ).get_json()

    response = client.get(
        "/api/dashboard",
        headers={"Authorization": f"Bearer {auth['access_token']}"},
    )

    assert response.status_code == 200
    assert response.get_json()["cantidad_docentes"] == 3
