from pathlib import Path

from app.analytics.reports import AnalyticsReportService
from app.models import Review, Teacher
from app.models.review import ReviewStatus


class PrologRuleService:
    def __init__(self) -> None:
        self.analytics = AnalyticsReportService()

    def evaluate(self) -> dict:
        try:
            from pyswip import Prolog

            prolog = Prolog()
            facts_path = self._write_facts()
            rules_path = Path(__file__).with_name("rules.pl")
            prolog.consult(str(facts_path))
            prolog.consult(str(rules_path))

            return {
                "docentes_promedio_mayor_4_5": self._query_names(
                    prolog,
                    "docente_destacado(Nombre)",
                ),
                "carrera_mejor_promedio": self._query_names(prolog, "mejor_carrera(Nombre)"),
                "facultades_en_seguimiento": self._query_names(
                    prolog,
                    "facultad_necesita_seguimiento(Nombre)",
                ),
                "docentes_de_ingenieria": self._query_names(
                    prolog,
                    "docente_de_ingenieria(Nombre)",
                ),
                "docentes_mas_50_resenas": self._query_names(
                    prolog,
                    "docente_con_mas_50_resenas(Nombre)",
                ),
                "prolog_engine": "pyswip",
            }
        except Exception as exc:
            return self._evaluate_fallback(exc)

    def _evaluate_fallback(self, exc: Exception | None = None) -> dict:
        try:
            self._write_facts()
        except Exception:
            pass

        teachers = Teacher.query.all()
        report = self.analytics.summary()
        promedio_carrera = report.get("promedio_por_carrera", {})
        promedio_facultad = report.get("promedio_por_facultad", {})

        docentes_destacados = [
            t.nombre_completo for t in teachers if float(t.promedio or 0) > 4.5
        ]
        docentes_mas_50 = [
            t.nombre_completo for t in teachers if self._visible_review_count(t) > 50
        ]
        docentes_ing = [
            t.nombre_completo
            for t in teachers
            if t.faculty and t.faculty.nombre == "Ingenieria"
        ]

        max_career_avg = max(promedio_carrera.values()) if promedio_carrera else None
        carreras_mejor = [
            career
            for career, avg in promedio_carrera.items()
            if max_career_avg is not None and avg == max_career_avg
        ]

        facultades_seguimiento = [
            fac for fac, avg in promedio_facultad.items() if avg < 3.0
        ]

        result = {
            "docentes_promedio_mayor_4_5": sorted(docentes_destacados),
            "carrera_mejor_promedio": sorted(carreras_mejor),
            "facultades_en_seguimiento": sorted(facultades_seguimiento),
            "docentes_de_ingenieria": sorted(docentes_ing),
            "docentes_mas_50_resenas": sorted(docentes_mas_50),
            "prolog_engine": "python_fallback",
        }
        if exc is not None:
            result["warning"] = f"PySWIP/SWI-Prolog no disponible: {exc}. Se utiliza motor de inferencia de respaldo en Python."
        return result

    def _write_facts(self) -> Path:
        report = self.analytics.summary()
        path = Path("app/static/reports/facts.pl")
        path.parent.mkdir(parents=True, exist_ok=True)

        teachers = Teacher.query.all()
        lines = [
            ":- discontiguous promedio_docente/2.",
            ":- discontiguous cantidad_resenas/2.",
            ":- discontiguous docente_facultad/2.",
        ]
        lines.extend(
            f"promedio_docente({self._atom(teacher.nombre_completo)}, {teacher.promedio})."
            for teacher in teachers
        )
        lines.extend(
            (
                f"cantidad_resenas({self._atom(teacher.nombre_completo)}, "
                f"{self._visible_review_count(teacher)})."
            )
            for teacher in teachers
        )
        lines.extend(
            (
                f"docente_facultad({self._atom(teacher.nombre_completo)}, "
                f"{self._atom(teacher.faculty.nombre if teacher.faculty else 'Sin facultad')})."
            )
            for teacher in teachers
        )

        for faculty, average in report.get("promedio_por_facultad", {}).items():
            lines.append(f"promedio_facultad({self._atom(faculty)}, {average}).")

        for career, average in report.get("promedio_por_carrera", {}).items():
            lines.append(f"promedio_carrera({self._atom(career)}, {average}).")

        if not Review.query.first():
            lines.append("promedio_docente('Sin datos', 0).")

        path.write_text("\n".join(lines), encoding="utf-8")
        return path

    @staticmethod
    def _atom(value: str) -> str:
        return "'" + value.replace("'", "\\'") + "'"

    @staticmethod
    def _visible_review_count(teacher: Teacher) -> int:
        return len([review for review in teacher.reviews if review.estado == ReviewStatus.VISIBLE])

    @staticmethod
    def _query_names(prolog, query: str) -> list[str]:
        return [str(row["Nombre"]) for row in prolog.query(query)]
