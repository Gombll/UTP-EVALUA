import logging

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db

logger = logging.getLogger(__name__)


def ensure_review_moderation_schema() -> None:
    inspector = inspect(db.engine)
    if "resenas" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("resenas")}
    dialect = db.engine.dialect.name

    statements: list[str] = []
    if "estado" not in columns:
        statements.append("ALTER TABLE resenas ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'visible'")
    if "motivo_reporte" not in columns:
        statements.append("ALTER TABLE resenas ADD COLUMN motivo_reporte VARCHAR(255) NULL")
    if "fecha_reporte" not in columns:
        statements.append("ALTER TABLE resenas ADD COLUMN fecha_reporte DATETIME NULL")
    if "reportado_por_id" not in columns:
        statements.append("ALTER TABLE resenas ADD COLUMN reportado_por_id INT NULL")

    with db.engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

    _ensure_unique_review_constraint(inspector, dialect)


def _ensure_unique_review_constraint(inspector, dialect: str) -> None:
    unique_names = {
        constraint["name"]
        for constraint in inspector.get_unique_constraints("resenas")
        if constraint.get("name")
    }
    index_names = {
        index["name"]
        for index in inspector.get_indexes("resenas")
        if index.get("unique") and index.get("name")
    }
    if "uq_resena_estudiante_docente" in unique_names | index_names:
        return

    _collapse_duplicate_reviews(dialect)
    statement = (
        "CREATE UNIQUE INDEX uq_resena_estudiante_docente "
        "ON resenas (docente_id, estudiante_id)"
        if dialect == "sqlite"
        else "ALTER TABLE resenas ADD CONSTRAINT uq_resena_estudiante_docente "
        "UNIQUE (docente_id, estudiante_id)"
    )
    try:
        with db.engine.begin() as connection:
            connection.execute(text(statement))
    except SQLAlchemyError as error:
        logger.warning("No se pudo crear la restriccion unica de resenas: %s", error)


def _collapse_duplicate_reviews(dialect: str) -> None:
    if dialect == "sqlite":
        statement = """
            DELETE FROM resenas
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM resenas
                GROUP BY docente_id, estudiante_id
            )
        """
    else:
        statement = """
            DELETE r
            FROM resenas r
            INNER JOIN (
                SELECT docente_id, estudiante_id, MAX(id) AS keep_id
                FROM resenas
                GROUP BY docente_id, estudiante_id
                HAVING COUNT(*) > 1
            ) duplicates
                ON r.docente_id = duplicates.docente_id
                AND r.estudiante_id = duplicates.estudiante_id
                AND r.id <> duplicates.keep_id
        """

    with db.engine.begin() as connection:
        result = connection.execute(text(statement))
        if result.rowcount and result.rowcount > 0:
            logger.warning(
                "Se consolidaron %s resenas duplicadas antes de crear la restriccion unica.",
                result.rowcount,
            )
