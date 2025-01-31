import json
import logging
import sys
from typing import Annotated, Generator, List, Optional

from fastapi import Depends, Form, HTTPException, status
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.db.engine import engine
from app.models.token import TokenPayload
from app.models.user import User
from app.services.task_progress import TaskProgressService

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False,
)


def get_db() -> Generator:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler(sys.stdout)
log_formatter = logging.Formatter("%(asctime)s [%(processName)s: %(process)d] [%(threadName)s: %(thread)d] [%(levelname)s] %(name)s: %(message)s")
stream_handler.setFormatter(log_formatter)
logger.addHandler(stream_handler)

def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user


def get_current_user_no_error(session: SessionDep, token: TokenDep) -> User:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        return None
    user = session.get(User, token_data.sub)
    if not user:
        return None
    if not user.is_active:
        return None
    return user


CurrentUserNoError = Annotated[User, Depends(get_current_user_no_error)]


def get_current_active_superuser_no_error(current_user: CurrentUserNoError) -> User:
    if not current_user:
        return None
    if not current_user.is_superuser:
        return None
    return current_user


def get_task_progress_service(session: SessionDep) -> TaskProgressService:
    return TaskProgressService(session)
