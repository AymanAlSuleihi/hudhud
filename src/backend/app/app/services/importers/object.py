from sqlmodel import Session

from app.crud.crud_object import obj as crud_object
from app.models.object import Object, ObjectCreate, ObjectUpdate
from app.services.importers.base import ImportService


class ObjectImportService(ImportService[Object, ObjectCreate, ObjectUpdate]):
    def __init__(self, session: Session):
        super().__init__(
            session=session,
            crud=crud_object,
            create_schema=ObjectCreate,
            update_schema=ObjectUpdate,
            api_endpoint="/objects",
        )