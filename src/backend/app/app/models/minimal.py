from typing import Optional

from sqlmodel import SQLModel


class SiteMinimal(SQLModel):
    id: int
    dasi_id: int
    modern_name: str
    ancient_name: str
    coordinates: Optional[tuple[float, float]] = ()
    coordinates_accuracy: Optional[str] = None


class ObjectMinimal(SQLModel):
    id: int
    dasi_id: int
    title: str
    deposits: Optional[list[dict]] = []
    support_notes: Optional[str] = None
    deposit_notes: Optional[str] = None
    cultural_notes: Optional[list[dict]] = []
    bibliography: Optional[list[dict]] = []


class EpigraphMinimal(SQLModel):
    id: int
    dasi_id: int
    title: str
    period: Optional[str] = None
