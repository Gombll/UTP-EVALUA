from pathlib import Path
from textwrap import shorten, wrap

import matplotlib
import numpy as np
import pandas as pd

from app.extensions import db

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


CHART_COLORS = {
    "primary": "#c9003f",
    "primary_dark": "#8f002d",
    "green": "#15754d",
    "teal": "#0f6b7a",
    "gold": "#f4a51c",
    "charcoal": "#202126",
    "muted": "#69707a",
    "grid": "#dfe3e7",
    "surface": "#fbfbfc",
}

CHART_PALETTE = [
    "#c9003f",
    "#15754d",
    "#0f6b7a",
    "#f4a51c",
    "#5c6670",
    "#8f002d",
]


class AnalyticsReportService:
    def __init__(self, output_dir: str = "app/static/reports") -> None:
        self.output_dir = Path(output_dir)
        if not self.output_dir.is_absolute():
            self.output_dir = Path.cwd() / self.output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _ratings_frame(self) -> pd.DataFrame:
        query = """
            SELECT r.id, r.calificacion, r.fecha, r.estado, r.estudiante_id,
                   d.id AS docente_id,
                   CONCAT(d.nombres, ' ', d.apellidos) AS docente,
                   f.nombre AS facultad, c.nombre AS carrera
            FROM resenas r
            JOIN docentes d ON d.id = r.docente_id
            JOIN facultades f ON f.id = d.facultad_id
            JOIN carreras c ON c.id = d.carrera_id
            WHERE r.estado = 'visible'
        """
        return pd.read_sql(query, db.session.connection())

    def _teachers_frame(self) -> pd.DataFrame:
        query = """
            SELECT d.id, d.nombres, d.apellidos, d.correo,
                   CONCAT(d.nombres, ' ', d.apellidos) AS docente,
                   f.nombre AS facultad, c.nombre AS carrera,
                   COALESCE(ROUND(AVG(r.calificacion), 2), 0) AS promedio,
                   COUNT(r.id) AS cantidad_resenas
            FROM docentes d
            JOIN facultades f ON f.id = d.facultad_id
            JOIN carreras c ON c.id = d.carrera_id
            LEFT JOIN resenas r ON r.docente_id = d.id AND r.estado = 'visible'
            GROUP BY d.id, d.nombres, d.apellidos, d.correo, f.nombre, c.nombre
        """
        return pd.read_sql(query, db.session.connection())

    def _students_frame(self) -> pd.DataFrame:
        query = """
            SELECT e.id, e.nombres, e.correo, e.role, e.active,
                   COUNT(r.id) AS cantidad_resenas
            FROM estudiantes e
            LEFT JOIN resenas r ON r.estudiante_id = e.id
            GROUP BY e.id, e.nombres, e.correo, e.role, e.active
        """
        return pd.read_sql(query, db.session.connection())

    def _careers_frame(self) -> pd.DataFrame:
        query = """
            SELECT c.id, c.nombre AS carrera, f.nombre AS facultad,
                   COALESCE(ROUND(AVG(r.calificacion), 2), 0) AS promedio,
                   COUNT(r.id) AS cantidad_resenas
            FROM carreras c
            JOIN facultades f ON f.id = c.facultad_id
            LEFT JOIN docentes d ON d.carrera_id = c.id
            LEFT JOIN resenas r ON r.docente_id = d.id AND r.estado = 'visible'
            GROUP BY c.id, c.nombre, f.nombre
        """
        return pd.read_sql(query, db.session.connection())

    def _faculties_frame(self) -> pd.DataFrame:
        query = """
            SELECT f.id, f.nombre AS facultad,
                   COALESCE(ROUND(AVG(r.calificacion), 2), 0) AS promedio,
                   COUNT(r.id) AS cantidad_resenas
            FROM facultades f
            LEFT JOIN docentes d ON d.facultad_id = f.id
            LEFT JOIN resenas r ON r.docente_id = d.id AND r.estado = 'visible'
            GROUP BY f.id, f.nombre
        """
        return pd.read_sql(query, db.session.connection())

    def _all_reviews_frame(self) -> pd.DataFrame:
        query = """
            SELECT id, calificacion, fecha, estado, docente_id, estudiante_id
            FROM resenas
        """
        return pd.read_sql(query, db.session.connection())

    def dataframes(self) -> dict[str, pd.DataFrame]:
        return {
            "docentes": self._teachers_frame(),
            "estudiantes": self._students_frame(),
            "resenas": self._ratings_frame(),
        }

    def summary(self) -> dict:
        df = self._ratings_frame()
        if df.empty:
            return {"message": "Sin datos suficientes para analytics."}

        frames = self.dataframes()
        ratings = df["calificacion"].to_numpy()
        normalized = self.normalize_ratings(df["calificacion"].to_numpy())
        return {
            "promedio_calificaciones": round(float(np.mean(ratings)), 2),
            "promedio_por_facultad": self.average_by(df, "facultad"),
            "promedio_por_carrera": self.average_by(df, "carrera"),
            "top_docentes": self.top_teachers(df),
            "bottom_docentes": self.bottom_teachers(df),
            "cantidad_resenas": int(df["id"].count()),
            "resenas_por_mes": self.reviews_by_month(df),
            "desviacion_estandar": float(np.std(df["calificacion"])),
            "varianza": float(np.var(df["calificacion"])),
            "percentiles": self.percentiles(ratings),
            "calificaciones_normalizadas": normalized.tolist(),
            "dataframes": {
                name: {"filas": int(frame.shape[0]), "columnas": list(frame.columns)}
                for name, frame in frames.items()
            },
        }

    def chart_data(self) -> dict:
        teachers = self._teachers_frame().sort_values(
            by=["promedio", "cantidad_resenas"],
            ascending=[False, False],
        )
        careers = self._careers_frame().sort_values(
            by=["promedio", "cantidad_resenas"],
            ascending=[False, False],
        )
        faculties = self._faculties_frame().sort_values(
            by=["promedio", "cantidad_resenas"],
            ascending=[False, False],
        )
        visible_reviews = self._ratings_frame()
        all_reviews = self._all_reviews_frame()

        visible_count = int((all_reviews["estado"] == "visible").sum()) if not all_reviews.empty else 0
        reported_count = int((all_reviews["estado"] == "reportada").sum()) if not all_reviews.empty else 0
        hidden_count = int((all_reviews["estado"] == "oculta").sum()) if not all_reviews.empty else 0
        average = 0 if visible_reviews.empty else round(float(visible_reviews["calificacion"].mean()), 2)

        return {
            "kpis": {
                "docentes": int(teachers.shape[0]),
                "carreras": int(careers.shape[0]),
                "facultades": int(faculties.shape[0]),
                "resenas_total": int(all_reviews.shape[0]),
                "resenas_visibles": visible_count,
                "resenas_reportadas": reported_count,
                "resenas_ocultas": hidden_count,
                "promedio_visible": average,
            },
            "ranking_docentes": self._teacher_records(teachers),
            "promedio_carreras": self._career_records(careers),
            "promedio_facultades": self._faculty_records(faculties),
            "distribucion_calificaciones": self._rating_distribution(visible_reviews),
            "estado_resenas": self._status_distribution(all_reviews),
            "resenas_por_mes": self._monthly_status(all_reviews),
            "cobertura_docentes": self._coverage_distribution(teachers, "docentes"),
            "cobertura_carreras": self._coverage_distribution(careers, "carreras"),
        }

    @staticmethod
    def average_by(df: pd.DataFrame, column: str) -> dict:
        return df.groupby(column)["calificacion"].mean().round(2).to_dict()

    @staticmethod
    def top_teachers(df: pd.DataFrame, limit: int = 10) -> list[dict]:
        result = (
            df.groupby("docente")["calificacion"]
            .mean()
            .sort_values(ascending=False)
            .head(limit)
        )
        return [{"docente": key, "promedio": round(value, 2)} for key, value in result.items()]

    @staticmethod
    def bottom_teachers(df: pd.DataFrame, limit: int = 10) -> list[dict]:
        result = (
            df.groupby("docente")["calificacion"]
            .mean()
            .sort_values(ascending=True)
            .head(limit)
        )
        return [{"docente": key, "promedio": round(value, 2)} for key, value in result.items()]

    @staticmethod
    def reviews_by_month(df: pd.DataFrame) -> dict:
        dates = pd.to_datetime(df["fecha"])
        return df.groupby(dates.dt.to_period("M").astype(str))["id"].count().to_dict()

    @staticmethod
    def percentiles(values: np.ndarray) -> dict:
        if values.size == 0:
            return {}
        result = np.percentile(values, [25, 50, 75, 90])
        return {
            "p25": round(float(result[0]), 2),
            "p50": round(float(result[1]), 2),
            "p75": round(float(result[2]), 2),
            "p90": round(float(result[3]), 2),
        }

    @staticmethod
    def normalize_ratings(values: np.ndarray) -> np.ndarray:
        if values.size == 0 or values.max() == values.min():
            return np.zeros(values.size)
        return (values - values.min()) / (values.max() - values.min())

    def export_to_excel(self) -> str:
        frames = self.dataframes()
        df = frames["resenas"]
        path = self.output_dir / "utp_evalua_analytics.xlsx"
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            frames["docentes"].to_excel(writer, index=False, sheet_name="docentes")
            frames["estudiantes"].to_excel(writer, index=False, sheet_name="estudiantes")
            df.to_excel(writer, index=False, sheet_name="resenas")
            if not df.empty:
                pd.DataFrame(self.top_teachers(df)).to_excel(
                    writer,
                    index=False,
                    sheet_name="top_docentes",
                )
                pd.DataFrame(
                    self.average_by(df, "facultad").items(),
                    columns=["facultad", "promedio"],
                ).to_excel(writer, index=False, sheet_name="promedio_facultad")
                pd.DataFrame(
                    self.average_by(df, "carrera").items(),
                    columns=["carrera", "promedio"],
                ).to_excel(writer, index=False, sheet_name="promedio_carrera")
                pd.DataFrame(
                    self.reviews_by_month(df).items(),
                    columns=["mes", "cantidad_resenas"],
                ).to_excel(writer, index=False, sheet_name="resenas_mes")
        return str(path)

    def export_to_csv(self) -> str:
        path = self.output_dir / "utp_evalua_resenas.csv"
        self._ratings_frame().to_csv(path, index=False, encoding="utf-8")
        return str(path)

    def generate_charts(self) -> list[str]:
        df = self._ratings_frame()
        if df.empty:
            return []

        paths = [
            self._top_teachers_chart(df),
            self._bar_chart(df),
            self._career_chart(df),
            self._line_chart(df),
            self._pie_chart(df),
        ]
        return [str(path) for path in paths]

    @staticmethod
    def _teacher_records(df: pd.DataFrame) -> list[dict]:
        return [
            {
                "id": int(row.id),
                "nombre": row.docente,
                "facultad": row.facultad,
                "carrera": row.carrera,
                "promedio": float(row.promedio),
                "resenas": int(row.cantidad_resenas),
            }
            for row in df.itertuples()
        ]

    @staticmethod
    def _career_records(df: pd.DataFrame) -> list[dict]:
        return [
            {
                "id": int(row.id),
                "nombre": row.carrera,
                "facultad": row.facultad,
                "promedio": float(row.promedio),
                "resenas": int(row.cantidad_resenas),
            }
            for row in df.itertuples()
        ]

    @staticmethod
    def _faculty_records(df: pd.DataFrame) -> list[dict]:
        return [
            {
                "id": int(row.id),
                "nombre": row.facultad,
                "promedio": float(row.promedio),
                "resenas": int(row.cantidad_resenas),
            }
            for row in df.itertuples()
        ]

    @staticmethod
    def _rating_distribution(df: pd.DataFrame) -> list[dict]:
        counts = df["calificacion"].value_counts().to_dict() if not df.empty else {}
        return [
            {"calificacion": rating, "cantidad": int(counts.get(rating, 0))}
            for rating in range(1, 6)
        ]

    @staticmethod
    def _status_distribution(df: pd.DataFrame) -> list[dict]:
        counts = df["estado"].value_counts().to_dict() if not df.empty else {}
        labels = {
            "visible": "Visibles",
            "reportada": "Reportadas",
            "oculta": "Ocultas",
        }
        return [
            {"estado": status, "label": label, "cantidad": int(counts.get(status, 0))}
            for status, label in labels.items()
        ]

    @staticmethod
    def _monthly_status(df: pd.DataFrame) -> list[dict]:
        statuses = ["visible", "reportada", "oculta"]
        current_month = pd.Timestamp.utcnow().to_period("M")
        months = pd.period_range(end=current_month, periods=6, freq="M")
        rows = {
            str(month): {"mes": str(month), "visible": 0, "reportada": 0, "oculta": 0, "total": 0}
            for month in months
        }
        if not df.empty:
            month_values = pd.to_datetime(df["fecha"]).dt.to_period("M").astype(str)
            grouped = df.assign(mes=month_values).groupby(["mes", "estado"])["id"].count()
            for (month, status), count in grouped.items():
                if month not in rows:
                    rows[month] = {"mes": month, "visible": 0, "reportada": 0, "oculta": 0, "total": 0}
                if status in statuses:
                    rows[month][status] = int(count)
                    rows[month]["total"] += int(count)
        return [rows[key] for key in sorted(rows.keys())]

    @staticmethod
    def _coverage_distribution(df: pd.DataFrame, label: str) -> list[dict]:
        with_reviews = int((df["cantidad_resenas"] > 0).sum()) if not df.empty else 0
        without_reviews = int((df["cantidad_resenas"] == 0).sum()) if not df.empty else 0
        return [
            {"estado": f"{label}_con_resenas", "label": "Con resenas", "cantidad": with_reviews},
            {"estado": f"{label}_sin_resenas", "label": "Sin resenas", "cantidad": without_reviews},
        ]

    def _top_teachers_chart(self, df: pd.DataFrame) -> Path:
        data = (
            df.groupby("docente")["calificacion"]
            .mean()
            .sort_values(ascending=False)
            .head(10)
        )
        path = self.output_dir / "top_10_docentes.png"
        labels = [self._wrap_label(label, 24) for label in data.index]
        fig, ax = self._figure("Top 10 docentes", "Ranking por promedio de calificacion visible")
        bars = ax.barh(labels, data.values, color=CHART_COLORS["primary"], height=0.58)
        ax.invert_yaxis()
        self._style_rating_axis(ax)
        self._label_bars(ax, bars, suffix="/5")
        self._save(fig, path)
        return path

    def _bar_chart(self, df: pd.DataFrame) -> Path:
        data = df.groupby("facultad")["calificacion"].mean().sort_values(ascending=True)
        path = self.output_dir / "promedio_facultad.png"
        labels = [self._wrap_label(label, 24) for label in data.index]
        fig, ax = self._figure("Promedio por facultad", "Comparacion del desempeno agregado")
        bars = ax.barh(labels, data.values, color=CHART_COLORS["green"], height=0.58)
        self._style_rating_axis(ax)
        self._label_bars(ax, bars, suffix="/5")
        self._save(fig, path)
        return path

    def _career_chart(self, df: pd.DataFrame) -> Path:
        data = df.groupby("carrera")["calificacion"].mean().sort_values(ascending=True)
        path = self.output_dir / "promedio_carrera.png"
        labels = [self._wrap_label(label, 24) for label in data.index]
        colors = [CHART_COLORS["teal"] if value < 4 else CHART_COLORS["primary"] for value in data.values]
        fig, ax = self._figure("Promedio por carrera", "Carreras evaluadas segun resenas visibles")
        bars = ax.barh(labels, data.values, color=colors, height=0.58)
        self._style_rating_axis(ax)
        self._label_bars(ax, bars, suffix="/5")
        self._save(fig, path)
        return path

    def _line_chart(self, df: pd.DataFrame) -> Path:
        data = pd.Series(self.reviews_by_month(df))
        path = self.output_dir / "resenas_mes.png"
        fig, ax = self._figure("Tendencia de resenas", "Evolucion mensual de participacion estudiantil")
        x_values = list(range(len(data.index)))
        ax.plot(
            x_values,
            data.values,
            color=CHART_COLORS["primary"],
            marker="o",
            linewidth=3,
            markersize=8,
        )
        ax.fill_between(x_values, data.values, color=CHART_COLORS["primary"], alpha=0.12)
        ax.set_xticks(x_values)
        ax.set_xticklabels(data.index, fontsize=10, color=CHART_COLORS["muted"])
        ax.set_ylim(bottom=0)
        ax.set_ylabel("Cantidad", color=CHART_COLORS["muted"])
        ax.grid(axis="y", color=CHART_COLORS["grid"], linewidth=1, alpha=0.8)
        self._clean_axes(ax)
        for x_value, y_value in zip(x_values, data.values):
            ax.annotate(
                str(int(y_value)),
                (x_value, y_value),
                textcoords="offset points",
                xytext=(0, 10),
                ha="center",
                color=CHART_COLORS["charcoal"],
                fontsize=10,
                fontweight="bold",
            )
        self._save(fig, path)
        return path

    def _pie_chart(self, df: pd.DataFrame) -> Path:
        data = df["calificacion"].value_counts().sort_index()
        path = self.output_dir / "distribucion_calificaciones.png"
        fig, ax = self._figure("Distribucion de calificaciones", "Participacion porcentual por nota")
        labels = [f"{rating}/5" for rating in data.index]
        wedges, _, autotexts = ax.pie(
            data.values,
            labels=labels,
            autopct="%1.0f%%",
            startangle=90,
            colors=CHART_PALETTE[: len(data)],
            pctdistance=0.78,
            wedgeprops={"width": 0.42, "edgecolor": "white", "linewidth": 2},
            textprops={"color": CHART_COLORS["charcoal"], "fontsize": 10, "fontweight": "bold"},
        )
        for text in autotexts:
            text.set_color("#ffffff")
            text.set_fontweight("bold")
        ax.text(
            0,
            0,
            f"{int(data.sum())}\nresenas",
            ha="center",
            va="center",
            color=CHART_COLORS["charcoal"],
            fontsize=14,
            fontweight="bold",
        )
        ax.legend(
            wedges,
            labels,
            title="Notas",
            loc="center left",
            bbox_to_anchor=(0.92, 0.5),
            frameon=False,
        )
        ax.set_aspect("equal")
        self._save(fig, path)
        return path

    def _figure(self, title: str, subtitle: str):
        fig, ax = plt.subplots(figsize=(11.5, 7), dpi=150)
        fig.patch.set_facecolor("#ffffff")
        ax.set_facecolor(CHART_COLORS["surface"])
        fig.suptitle(
            title,
            x=0.08,
            y=0.97,
            ha="left",
            color=CHART_COLORS["charcoal"],
            fontsize=19,
            fontweight="bold",
        )
        fig.text(
            0.08,
            0.925,
            subtitle,
            ha="left",
            color=CHART_COLORS["muted"],
            fontsize=10,
        )
        return fig, ax

    @staticmethod
    def _style_rating_axis(ax) -> None:
        ax.set_xlim(0, 5)
        ax.set_xlabel("Promedio", color=CHART_COLORS["muted"], labelpad=10)
        ax.tick_params(axis="x", colors=CHART_COLORS["muted"])
        ax.tick_params(axis="y", colors=CHART_COLORS["charcoal"], labelsize=10)
        ax.grid(axis="x", color=CHART_COLORS["grid"], linewidth=1, alpha=0.8)
        AnalyticsReportService._clean_axes(ax)

    @staticmethod
    def _clean_axes(ax) -> None:
        for spine in ax.spines.values():
            spine.set_visible(False)
        ax.set_axisbelow(True)

    @staticmethod
    def _label_bars(ax, bars, suffix: str = "") -> None:
        for bar in bars:
            width = bar.get_width()
            ax.text(
                min(width + 0.06, 4.82),
                bar.get_y() + bar.get_height() / 2,
                f"{width:.2f}{suffix}",
                va="center",
                ha="left",
                color=CHART_COLORS["charcoal"],
                fontsize=10,
                fontweight="bold",
            )

    @staticmethod
    def _wrap_label(value: str, width: int) -> str:
        compact = shorten(value, width=48, placeholder="...")
        return "\n".join(wrap(compact, width=width)) or compact

    @staticmethod
    def _save(fig, path: Path) -> None:
        fig.tight_layout(rect=(0.05, 0.05, 0.98, 0.88))
        fig.savefig(path, bbox_inches="tight", facecolor=fig.get_facecolor())
        plt.close(fig)
