import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test-secret"

from app.database import get_db
from app.main import app
from app.models import Base
from app.services import auth_service
from app.websockets.manager import manager


class FakeEmailSender:
    def __init__(self):
        self.codes_by_email: dict[str, str] = {}

    def send_verification_code(self, *, email: str, username: str, code: str) -> None:
        self.codes_by_email[email] = code


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    manager.active.clear()
    fake_sender = FakeEmailSender()
    original_sender = auth_service.email_sender
    auth_service.email_sender = fake_sender

    try:
        with TestClient(app) as test_client:
            test_client.fake_email_sender = fake_sender
            yield test_client
    finally:
        app.dependency_overrides.clear()
        manager.active.clear()
        auth_service.email_sender = original_sender
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
