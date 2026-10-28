from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    f_name: str
    l_name: str
    gender: str | None
    email: str
    phone_no: str | None
    role: str
    account_status: str
    created_at: datetime
    terms_accepted_at: datetime | None

class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    size: int