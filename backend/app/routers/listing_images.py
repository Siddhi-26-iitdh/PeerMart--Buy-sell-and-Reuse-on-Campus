import base64
import mimetypes
import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.user import User
from app.schemas.listing_images import (
    ListingImageCreate,
    ListingImageListResponse,
    ListingImageOrderUpdate,
    ListingImageResponse,
)

router = APIRouter(prefix="/listing-images", tags=["ListingImage"])
uploads_router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB per image


def get_upload_dir() -> Path:
    configured = os.environ.get("PEERMART_UPLOAD_DIR")
    if configured:
        path = Path(configured)
    else:
        path = Path(__file__).resolve().parent.parent.parent / "uploads"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _next_display_order(db: Session, listing_id: int) -> int:
    current_max = db.scalar(
        select(func.max(ListingImage.display_order)).where(
            ListingImage.listing_id == listing_id
        )
    )
    return (current_max or 0) + 1


def _validate_image_magic_bytes(raw_bytes: bytes, ext_lower: str) -> None:
    if ext_lower in {".jpg", ".jpeg"}:
        if not raw_bytes.startswith(b"\xff\xd8\xff"):
            raise HTTPException(
                status_code=422,
                detail="Invalid JPEG image content",
            )
    elif ext_lower == ".png":
        if not raw_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            raise HTTPException(
                status_code=422,
                detail="Invalid PNG image content",
            )


def _save_uploaded_bytes(listing_id: int, raw_bytes: bytes, ext: str) -> tuple[str, Path]:
    if not raw_bytes:
        raise HTTPException(status_code=422, detail="Uploaded image file is empty")
    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Uploaded image exceeds the 5 MB per-file limit",
        )
    ext_lower = ext.lower() if ext else ".jpg"
    if ext_lower not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail="Unsupported image format. Only JPEG and PNG files are allowed.",
        )
    _validate_image_magic_bytes(raw_bytes, ext_lower)

    upload_dir = get_upload_dir()
    filename = f"listing_{listing_id}_{uuid4().hex[:12]}{ext_lower}"
    target = upload_dir / filename
    target.write_bytes(raw_bytes)
    return f"/api/uploads/{filename}", target


@router.get("", response_model=ListingImageListResponse)
def list_listing_images(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=200),
    listing_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    filters = []
    if listing_id is not None:
        filters.append(ListingImage.listing_id == listing_id)

    total = db.scalar(
        select(func.count()).select_from(ListingImage).where(*filters)
    ) or 0
    items = db.scalars(
        select(ListingImage)
        .where(*filters)
        .order_by(ListingImage.listing_id, ListingImage.display_order, ListingImage.image_id)
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get(
    "/{item_id}",
    response_model=ListingImageResponse,
    responses={404: {"description": "ListingImage not found"}},
)
def get_listing_image(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(ListingImage, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="ListingImage not found",
        )

    return item


@router.post("", response_model=ListingImageResponse, status_code=201)
async def create_listing_image(
    request: Request,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    content_type = request.headers.get("content-type", "").lower()

    listing_id: int | None = None
    display_order: int | None = None
    image_path: str | None = None
    written_file: Path | None = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        raw_listing_id = form.get("listing_id")
        if raw_listing_id is None:
            raise HTTPException(status_code=422, detail="listing_id is required")
        try:
            listing_id = int(str(raw_listing_id))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid listing_id") from exc

        raw_order = form.get("display_order")
        if raw_order is not None and str(raw_order).strip():
            try:
                display_order = int(str(raw_order))
            except ValueError as exc:
                raise HTTPException(status_code=422, detail="Invalid display_order") from exc

        upload = form.get("file") or form.get("image")
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(status_code=422, detail="Image file is required")

        raw_bytes = await upload.read()
        orig_name = getattr(upload, "filename", None) or "upload.jpg"
        ext = Path(orig_name).suffix or ".jpg"
        image_path, written_file = _save_uploaded_bytes(listing_id, raw_bytes, ext)
    else:
        try:
            body = await request.json()
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Invalid request body") from exc
        payload = ListingImageCreate.model_validate(body)
        listing_id = payload.listing_id
        display_order = payload.display_order

        if payload.image_base64:
            b64_data = payload.image_base64
            ext = Path(payload.filename or "upload.png").suffix or ".png"
            if "," in b64_data and b64_data.startswith("data:"):
                header, b64_data = b64_data.split(",", 1)
                ext = ".png" if "png" in header else ".jpg"
            try:
                raw_bytes = base64.b64decode(b64_data)
            except Exception as exc:
                raise HTTPException(status_code=422, detail="Invalid base64 image") from exc
            image_path, written_file = _save_uploaded_bytes(listing_id, raw_bytes, ext)
        elif payload.image_path and payload.image_path.strip():
            image_path = payload.image_path.strip()
        else:
            raise HTTPException(
                status_code=422,
                detail="Provide an image file, image_base64, or image_path",
            )

    def _cleanup_file() -> None:
        if written_file is not None and written_file.is_file():
            try:
                written_file.unlink()
            except OSError:
                pass

    listing = db.get(Listing, listing_id)
    if listing is None or listing.status in ("removed", "archived"):
        _cleanup_file()
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.seller_id != current_user.user_id and current_user.role != "admin":
        _cleanup_file()
        raise HTTPException(
            status_code=403,
            detail="Only the listing seller can upload images for this listing",
        )

    existing_count = db.scalar(
        select(func.count())
        .select_from(ListingImage)
        .where(ListingImage.listing_id == listing_id)
    ) or 0
    if existing_count >= 5:
        _cleanup_file()
        raise HTTPException(
            status_code=422,
            detail="A listing can have at most 5 images",
        )

    if display_order is None or display_order < 1:
        display_order = _next_display_order(db, listing_id)
    else:
        conflict = db.scalar(
            select(ListingImage).where(
                ListingImage.listing_id == listing_id,
                ListingImage.display_order == display_order,
            )
        )
        if conflict is not None:
            display_order = _next_display_order(db, listing_id)

    record = ListingImage(
        listing_id=listing_id,
        image_path=image_path,
        display_order=display_order,
    )
    try:
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        _cleanup_file()
        raise

    return record


@router.patch("/{image_id}", response_model=ListingImageResponse)
def update_listing_image_order(
    image_id: int,
    payload: ListingImageOrderUpdate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    record = db.get(ListingImage, image_id)
    if record is None:
        raise HTTPException(status_code=404, detail="ListingImage not found")

    listing = db.get(Listing, record.listing_id)
    if listing is None or (
        listing.seller_id != current_user.user_id and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the listing seller can reorder images",
        )

    if record.display_order == payload.display_order:
        return record

    existing = db.scalar(
        select(ListingImage).where(
            ListingImage.listing_id == record.listing_id,
            ListingImage.display_order == payload.display_order,
        )
    )
    old_order = record.display_order
    if existing is not None and existing.image_id != record.image_id:
        existing.display_order = -1
        db.flush()
        record.display_order = payload.display_order
        db.flush()
        existing.display_order = old_order
    else:
        record.display_order = payload.display_order

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{image_id}")
def delete_listing_image(
    image_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    record = db.get(ListingImage, image_id)
    if record is None:
        raise HTTPException(status_code=404, detail="ListingImage not found")

    listing = db.get(Listing, record.listing_id)
    if listing is None or (
        listing.seller_id != current_user.user_id and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the listing seller can delete this image",
        )

    image_path = record.image_path
    db.delete(record)
    db.commit()

    if image_path.startswith("/api/uploads/"):
        fname = image_path.removeprefix("/api/uploads/")
        if "/" not in fname and ".." not in fname:
            file_path = get_upload_dir() / fname
            if file_path.is_file():
                try:
                    file_path.unlink()
                except OSError:
                    pass

    return {"message": "Listing image deleted", "image_id": image_id}


@uploads_router.get("/{filename}")
def serve_uploaded_image(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    target = get_upload_dir() / filename
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    media_type, _ = mimetypes.guess_type(str(target))
    return FileResponse(target, media_type=media_type or "application/octet-stream")
