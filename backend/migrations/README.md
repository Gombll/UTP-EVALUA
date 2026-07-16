# Migraciones

Este proyecto usa Flask-Migrate/Alembic.

Comandos habituales desde `backend/`:

```bash
flask --app run.py db init
flask --app run.py db migrate -m "initial schema"
flask --app run.py db upgrade
```

La carpeta queda preparada para que el equipo genere las revisiones reales contra MySQL.
