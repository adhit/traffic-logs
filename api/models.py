from pydantic import BaseModel
from typing import Optional


class DeviceUpdate(BaseModel):
    friendly_name: str


class SummaryRequest(BaseModel):
    from_date: str  # ISO8601
    to_date: str
