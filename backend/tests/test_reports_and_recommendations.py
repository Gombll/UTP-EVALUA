from app import create_app
from app.config.settings import TestConfig
from app.database.seed import seed_database
from app.extensions import db


def _auth_headers(client) -> dict:
    auth = client.post(
        "/api/auth/login",
        json={"correo": "admin@utp.edu.pe", "password": "Admin123*"},
    )
    token = auth.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _app_client():
    app = create_app(TestConfig)
    client = app.test_client()
    with app.app_context():
        db.create_all()
        seed_database()
    return client


def test_analytics_includes_syllabus_metrics():
    client = _app_client()
    response = client.get("/api/reportes/analytics", headers=_auth_headers(client))
    data = response.get_json()

    assert response.status_code == 200
    assert "percentiles" in data
    assert "promedio_calificaciones" in data
    assert "dataframes" in data
    assert {"docentes", "estudiantes", "resenas"} <= set(data["dataframes"])


def test_reports_export_csv_and_generate_charts():
    client = _app_client()
    headers = _auth_headers(client)

    csv_response = client.get("/api/reportes/csv", headers=headers)
    charts_response = client.get("/api/reportes/graficos", headers=headers)

    assert csv_response.status_code == 200
    assert charts_response.status_code == 200
    assert any(
        "top_10_docentes" in chart["url"]
        for chart in charts_response.get_json()["graficos"]
    )


def test_chart_data_includes_complete_admin_datasets():
    client = _app_client()
    response = client.get("/api/reportes/graficos-data", headers=_auth_headers(client))
    data = response.get_json()

    assert response.status_code == 200
    assert data["kpis"]["docentes"] == 3
    assert data["kpis"]["carreras"] == 3
    assert len(data["ranking_docentes"]) == 3
    assert len(data["promedio_carreras"]) == 3
    assert len(data["distribucion_calificaciones"]) == 5
    assert len(data["resenas_por_mes"]) >= 6
    assert any(career["nombre"] == "Administracion" for career in data["promedio_carreras"])


def test_recommendations_module_returns_teacher_recommendations():
    client = _app_client()
    response = client.get("/api/recomendaciones", headers=_auth_headers(client))
    data = response.get_json()

    assert response.status_code == 200
    assert "docentes_recomendados" in data
    assert "docentes_por_carrera" in data


def test_prolog_includes_syllabus_rules():
    client = _app_client()
    response = client.get("/api/reportes/prolog", headers=_auth_headers(client))
    data = response.get_json()

    assert response.status_code == 200
    assert "docentes_promedio_mayor_4_5" in data
    assert "docentes_de_ingenieria" in data
    assert "docentes_mas_50_resenas" in data
