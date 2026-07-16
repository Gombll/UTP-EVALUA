# Docker

Desde la raiz del proyecto:

```bash
cp .env.example .env
docker compose up --build
```

Servicios:

- Angular: `http://localhost:4200`
- Flask API: `http://localhost:5000/api`
- Swagger JSON: `http://localhost:5000/api/swagger.json`
- MySQL: `localhost:3307`

Si ya tenias contenedores levantados antes de los cambios de resenas, reconstruye:

```bash
docker compose up --build
```

El volumen `mysql_data` conserva la base local. El backend intenta agregar las columnas nuevas de moderacion al arrancar.
