from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import auth, chats, messages, users, websocket


def create_app() -> FastAPI:
    app = FastAPI(title="Chat App API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(chats.router, prefix="/api")
    app.include_router(messages.router, prefix="/api")
    app.include_router(websocket.router, prefix="/api")

    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    @app.get("/api/health")
    def api_health_check():
        return {"status": "ok"}

    @app.get("/api/healthz")
    def legacy_health_check():
        return {"status": "ok"}

    return app


app = create_app()
