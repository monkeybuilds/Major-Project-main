from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

# Build engine kwargs based on DB backend
_is_sqlite = DATABASE_URL.startswith("sqlite")
_engine_kwargs: dict = {}

if _is_sqlite:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL pool settings
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_size"] = 5

engine = create_engine(DATABASE_URL, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    from models.user import User  # noqa: F401
    from models.document import Document  # noqa: F401
    from models.chat import ChatSession, ChatMessage  # noqa: F401
    Base.metadata.create_all(bind=engine)
