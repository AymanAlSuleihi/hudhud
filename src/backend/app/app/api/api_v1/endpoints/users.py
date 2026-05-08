from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.api.params import PageLimit, PageOffset, ResourceIdPath
from app.core.config import settings
from app.crud.crud_user import user as crud_user
from app.models.user import (
    User,
    UserCreate,
    UserCreateOpen,
    UserOut,
    UserUpdate,
    UserUpdateMe,
)
# from app.utils import send_new_account_email

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=List[UserOut],
)
def read_users(session: SessionDep, skip: PageOffset = 0, limit: PageLimit = 100) -> List[User]:
    """
    Retrieve users.
    """
    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()
    return users


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserOut
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> User:
    """
    Create new user.
    """
    user = crud_user.get_by_email(db=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The user with this username already exists in the system.",
        )

    user = crud_user.create(db=session, obj_in=user_in)
    # if settings.EMAILS_ENABLED and user_in.email:
    #     send_new_account_email(
    #         email_to=user_in.email, username=user_in.email, password=user_in.password
    #     )
    return user


@router.put("/me", response_model=UserOut)
def update_user_me(
    *, session: SessionDep, body: UserUpdateMe, current_user: CurrentUser
) -> User:
    """
    Update own user.
    """
    if body.email and body.email != current_user.email:
        existing_user = crud_user.get_by_email(db=session, email=body.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The user with this email already exists in the system.",
            )

    user_in = UserUpdate(**body.model_dump(exclude_unset=True))
    return crud_user.update(db=session, db_obj=current_user, obj_in=user_in)


@router.get("/me", response_model=UserOut)
def read_user_me(session: SessionDep, current_user: CurrentUser) -> User:
    """
    Get current user.
    """
    return current_user


@router.post("/open", response_model=UserOut)
def create_user_open(session: SessionDep, user_in: UserCreateOpen) -> User:
    """
    Create new user without the need to be logged in.
    """
    if not settings.USERS_OPEN_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Open user registration is forbidden on this server",
        )
    user = crud_user.get_by_email(db=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The user with this username already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud_user.create(db=session, obj_in=user_create)
    return user


@router.get("/{user_id}", response_model=UserOut)
def read_user_by_id(
    user_id: ResourceIdPath, session: SessionDep, current_user: CurrentUser
) -> User:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The user does not exist in the system.",
        )
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.put(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserOut,
)
def update_user(
    *,
    session: SessionDep,
    user_id: ResourceIdPath,
    user_in: UserUpdate,
) -> User:
    """
    Update a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The user with this username does not exist in the system",
        )
    return crud_user.update(db=session, db_obj=user, obj_in=user_in)
