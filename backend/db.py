from typing import Optional, List
from sqlmodel import Field, Session, SQLModel, create_engine, select
import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    chat_id: str = Field(index=True)
    role: str
    content: str
    sources: Optional[str] = None
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
