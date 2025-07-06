from typing import Optional

from sqlmodel import SQLModel


class SiteMinimal(SQLModel):
    id: int
    dasi_id: int
    modern_name: str
    ancient_name: str
    country: Optional[str] = None
    governorate: Optional[str] = None
    geographical_area: Optional[str] = None
    coordinates: Optional[tuple[float, float]] = ()
    coordinates_accuracy: Optional[str] = None
    type_of_site: Optional[str] = None
    deities: Optional[list[str]] = []
    tribe: Optional[list[str]] = []
    identification: Optional[str] = None
    kingdom: Optional[list[str]] = []
    language: Optional[str] = None


class ObjectMinimal(SQLModel):
    id: int
    dasi_id: int
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period: Optional[str] = None
    deposits: Optional[list[dict]] = []
    materials: Optional[list[str]] = []
    shape: Optional[str] = None
    measures: Optional[str] = None
    decorations: Optional[list[dict]] = []
    support_type_level_1: Optional[str] = None
    support_type_level_2: Optional[str] = None
    support_type_level_3: Optional[str] = None
    support_type_level_4: Optional[str] = None
    support_notes: Optional[str] = None
    deposit_notes: Optional[str] = None
    cultural_notes: Optional[list[dict]] = []
    bibliography: Optional[list[dict]] = []
    concordances: Optional[list[str]] = []
    first_published: Optional[str] = None
    dasi_published: Optional[bool] = None


class EpigraphMinimal(SQLModel):
    id: int
    dasi_id: int
    title: str
    period: Optional[str] = None
    dasi_published: Optional[bool] = None
