from sqlmodel import SQLModel


class SiteMinimal(SQLModel):
    id: int
    dasi_id: int
    modern_name: str


class ObjectMinimal(SQLModel):
    id: int
    dasi_id: int
    title: str


class EpigraphMinimal(SQLModel):
    id: int
    dasi_id: int
    title: str
