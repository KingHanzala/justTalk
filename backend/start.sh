#!/bin/sh
set -eu

python - <<'PY'
import socket
import sys
import time
from urllib.parse import urlparse

from app.config import settings

parsed = urlparse(settings.database_url)
host = parsed.hostname or "localhost"
port = parsed.port or 5432

deadline = time.time() + 60
last_error = None

while time.time() < deadline:
    try:
        with socket.create_connection((host, port), timeout=2):
            sys.exit(0)
    except OSError as exc:
        last_error = exc
        time.sleep(1)

print(f"Database at {host}:{port} did not become ready in time: {last_error}", file=sys.stderr)
sys.exit(1)
PY

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
