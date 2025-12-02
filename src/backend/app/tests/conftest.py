import os
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app.main import app
from app.api.deps import get_db

from app.models.user import User
from app.models.epigraph import Epigraph
from app.models.epigraph_chunk import EpigraphChunk
from app.models.site import Site
from app.models.object import Object
from app.models.word import Word


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    f"postgresql+psycopg://postgres:{os.getenv('POSTGRES_PASSWORD', 'changethis')}@db/test_hudhud"
)


@pytest.fixture(scope="session")
def engine():
    """Create a test database engine with cleanup."""
    test_engine = create_engine(TEST_DATABASE_URL, echo=False)

    SQLModel.metadata.create_all(test_engine)

    yield test_engine

    SQLModel.metadata.drop_all(test_engine)
    test_engine.dispose()


@pytest.fixture(name="session")
def session_fixture(engine) -> Generator[Session, None, None]:
    """Create a test database session with transaction rollback."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """Create a test client with dependency overrides."""

    def get_session_override():
        return session

    app.dependency_overrides[get_db] = get_session_override

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
        "is_active": True,
        "is_superuser": False,
    }
