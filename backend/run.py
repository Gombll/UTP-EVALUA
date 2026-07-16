import sys
from pathlib import Path

# Agregar el directorio backend al sys.path para que pueda encontrar 'app'
sys.path.insert(0, str(Path(__file__).parent))

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
