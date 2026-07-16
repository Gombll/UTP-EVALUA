# Backend - UTP Evalua

Backend Flask RESTX de la plataforma UTP Evalua.

## Estructura activa

```text
backend/
  app/
    config/
    controllers/
    services/
    repositories/
    models/
    schemas/
    routes/
    middleware/
    utils/
    analytics/
    logic/
    database/
  tests/
  run.py
```

Los archivos activos viven dentro de `backend/app`. Cualquier modulo legacy fuera de esa carpeta debe considerarse retirado.

## Ejecutar

Desde la raiz del proyecto, la forma recomendada es Docker:

```powershell
docker compose up --build
```

Para ejecutar localmente:

```powershell
cd backend
python -m pytest
flask --app run.py run --debug --host 0.0.0.0 --port 5000
```

API: `http://localhost:5000/api`
Swagger JSON: `http://localhost:5000/api/swagger.json`
