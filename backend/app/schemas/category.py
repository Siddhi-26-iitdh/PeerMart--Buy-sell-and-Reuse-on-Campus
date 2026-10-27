from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    category_name: str


class CategoryListResponse(BaseModel):
    items: list[CategoryResponse]
    total: int
