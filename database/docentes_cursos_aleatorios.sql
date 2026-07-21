USE utp_evalua;

START TRANSACTION;

UPDATE docentes AS d
JOIN (
    SELECT
        id AS docente_id,
        ROW_NUMBER() OVER (ORDER BY RAND()) AS rn
    FROM docentes
    WHERE carrera_id = 2
      AND correo REGEXP '^docente[0-9]+@utp[.]edu[.]pe$'
) AS docentes_sistemas ON docentes_sistemas.docente_id = d.id
JOIN (
    SELECT
        id AS curso_id,
        ROW_NUMBER() OVER (ORDER BY RAND()) AS rn,
        COUNT(*) OVER () AS total_cursos
    FROM cursos
    WHERE carrera_id = 2
) AS cursos_sistemas
    ON cursos_sistemas.rn = ((docentes_sistemas.rn - 1) % cursos_sistemas.total_cursos) + 1
SET
    d.curso_id = cursos_sistemas.curso_id,
    d.updated_at = CURRENT_TIMESTAMP;

COMMIT;
