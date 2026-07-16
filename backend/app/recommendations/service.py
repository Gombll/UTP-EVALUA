from app.analytics.reports import AnalyticsReportService


class RecommendationService:
    def __init__(self) -> None:
        self.analytics = AnalyticsReportService()

    def summary(self) -> dict:
        frames = self.analytics.dataframes()
        teachers = frames["docentes"]
        reviews = frames["resenas"]

        if teachers.empty:
            return {"message": "Sin docentes suficientes para recomendaciones."}

        eligible_teachers = teachers[teachers["cantidad_resenas"] > 0].copy()
        if eligible_teachers.empty:
            return {"message": "Sin resenas suficientes para recomendaciones."}

        recommended = eligible_teachers.sort_values(
            by=["promedio", "cantidad_resenas"],
            ascending=[False, False],
        ).head(10)

        by_career = {}
        for career, group in eligible_teachers.groupby("carrera"):
            by_career[career] = self._records(
                group.sort_values(
                    by=["promedio", "cantidad_resenas"],
                    ascending=[False, False],
                ).head(3)
            )

        standout_faculties = {}
        if not reviews.empty:
            standout_faculties = (
                reviews.groupby("facultad")["calificacion"]
                .mean()
                .round(2)
                .sort_values(ascending=False)
                .to_dict()
            )

        return {
            "docentes_recomendados": self._records(recommended),
            "docentes_por_carrera": by_career,
            "facultades_destacadas": standout_faculties,
            "criterios": {
                "promedio_minimo": 1,
                "orden": "mayor promedio y mayor cantidad de resenas visibles",
            },
        }

    @staticmethod
    def _records(frame) -> list[dict]:
        columns = ["id", "docente", "facultad", "carrera", "promedio", "cantidad_resenas"]
        return frame[columns].to_dict(orient="records")
