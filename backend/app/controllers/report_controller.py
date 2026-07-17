from pathlib import Path

from flask import request, send_file, url_for
from flask_restx import Namespace, Resource

from app.analytics.reports import AnalyticsReportService
from app.logic.prolog_engine import PrologRuleService
from app.models import Role
from app.utils.security import role_required

ns = Namespace("reportes", description="Analytics y reglas Prolog")
analytics = AnalyticsReportService()
rules = PrologRuleService()


@ns.route("/analytics")
class AnalyticsResource(Resource):
    @role_required(Role.ADMIN)
    def get(self):
        return analytics.summary()


@ns.route("/excel")
class ExcelResource(Resource):
    @role_required(Role.ADMIN)
    def get(self):
        path = analytics.export_to_excel()
        return send_file(path, as_attachment=True)


@ns.route("/csv")
class CsvResource(Resource):
    @role_required(Role.ADMIN)
    def get(self):
        path = analytics.export_to_csv()
        return send_file(path, as_attachment=True)


@ns.route("/graficos")
class ChartResource(Resource):
    @role_required(Role.ADMIN)
    def get(self):
        charts = []
        for path in analytics.generate_charts():
            filename = Path(path).name
            charts.append(
                {
                    "titulo": CHART_TITLES.get(filename, filename),
                    "tipo": CHART_TYPES.get(filename, "grafico"),
                    "url": url_for(
                        "static",
                        filename=f"reports/{filename}",
                        _external=True,
                        _scheme=request.scheme,
                    ),
                }
            )
        return {"graficos": charts}


@ns.route("/graficos-data")
class ChartDataResource(Resource):
    @role_required(Role.ADMIN)
    def get(self):
        return analytics.chart_data()


@ns.route("/prolog")
class PrologResource(Resource):
    @role_required(Role.ADMIN)
    def get(self):
        return rules.evaluate()


CHART_TITLES = {
    "top_10_docentes.png": "Top 10 docentes",
    "promedio_facultad.png": "Promedio por facultad",
    "promedio_carrera.png": "Promedio por carrera",
    "resenas_mes.png": "Tendencia de resenas por mes",
    "distribucion_calificaciones.png": "Distribucion de calificaciones",
}

CHART_TYPES = {
    "top_10_docentes.png": "barras",
    "promedio_facultad.png": "barras",
    "promedio_carrera.png": "barras",
    "resenas_mes.png": "lineas",
    "distribucion_calificaciones.png": "pastel",
}
