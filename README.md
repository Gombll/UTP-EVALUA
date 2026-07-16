# UTP+EVALUA

Plataforma web universitaria para evaluar docentes de forma anonima, con Angular 20, Flask RESTX, MySQL 8, JWT, analytics con pandas/NumPy/Matplotlib y reglas con PySWIP.

## Arbol del proyecto

```text
ratemyprofessor/
  frontend/                 Angular 20 + Angular Material
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
      static/
      templates/
    migrations/
    tests/
    run.py
  database/
  docs/
  docker/
  docker-compose.yml
  requirements.txt
  .env.example
```

## Credenciales demo

- Administrador: `admin@utp.edu.pe` / `Admin123*`
- Estudiante: `estudiante@utp.edu.pe` / `Estudiante123*`

## Instalacion local

Requisitos:

- Python 3.12
- Node.js 22
- MySQL 8
- SWI-Prolog si se usara PySWIP

```bash
cd C:\Users\999.vegaa\Documents\GitHub\UTP-EVALUA
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Configura `.env` con tu conexion MySQL:

```env
DATABASE_URL=mysql+pymysql://utp_user:utp_password@localhost:3307/utp_evalua
JWT_SECRET_KEY=change-me-too
CORS_ORIGINS=http://localhost:4200
```

## Base de datos y migraciones

Puedes crear el esquema inicial con:

```bash
mysql -u root -p < database/schema.sql
```

O usar Flask-Migrate desde `backend/`:

```bash
flask --app run.py db init
flask --app run.py db migrate -m "initial schema"
flask --app run.py db upgrade
flask --app run.py seed
```

## Ejecutar backend Flask

```bash
cd C:\Users\999.vegaa\Documents\GitHub\UTP-EVALUA/backend
flask --app run.py run --debug --host 0.0.0.0 --port 5000
```

Swagger JSON queda en `http://localhost:5000/api/swagger.json`.

## Ejecutar frontend Angular

```bash
cd C:\Users\999.vegaa\Documents\GitHub\UTP-EVALUA/frontend
npm install
npm start
```

Angular queda en `http://localhost:4200`.

## Analytics

El modulo `backend/app/analytics/reports.py` calcula:

- Promedio por facultad
- Promedio por carrera
- Top y bottom docentes
- Cantidad de resenas por mes
- Desviacion estandar y varianza
- Normalizacion de calificaciones
- Exportacion a Excel
- Graficos de barras, lineas y pastel

Endpoints:

- `GET /api/reportes/analytics`
- `GET /api/reportes/excel`

## PySWIP / Prolog

El modulo `backend/app/logic/` genera hechos desde MySQL y consulta reglas:

- Docentes con promedio mayor a 4.5
- Carrera con mejor promedio
- Facultad que necesita seguimiento
- Docentes con mas de 20 resenas

Endpoint:

- `GET /api/reportes/prolog`

Si SWI-Prolog no esta instalado, la API devuelve una advertencia sin romper el sistema.

## Docker

```bash
cd C:\Users\999.vegaa\Documents\GitHub\UTP-EVALUA
cp .env.example .env
docker compose up --build
```

Servicios:

- Frontend: `http://localhost:4200`
- API: `http://localhost:5000/api`
- Swagger JSON: `http://localhost:5000/api/swagger.json`
- MySQL: `localhost:3307`

## Pruebas

```bash
cd C:\Users\999.vegaa\Documents\GitHub\UTP-EVALUA/backend
pytest
```

## Capturas esperadas

Pantallas principales para documentar en la entrega:

- Login y registro
- Dashboard
- CRUD de facultades, carreras, docentes, estudiantes y resenas
- Reportes analytics
- Swagger REST API

## Buenas practicas aplicadas

- Arquitectura por capas.
- Modelos SQLAlchemy con relaciones y claves foraneas.
- JWT con roles Administrador y Estudiante.
- Repositorios reutilizables con paginacion, busqueda, filtros y ordenamiento.
- Servicios desacoplados para reglas de negocio.
- Manejo global de errores.
- Logging basico.
- Datos semilla.
- Pruebas unitarias basicas.
- Frontend con lazy loading, guards e interceptor JWT.

