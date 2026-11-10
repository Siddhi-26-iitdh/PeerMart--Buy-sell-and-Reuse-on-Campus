"""Upload finalized PeerMart images to Supabase Storage."""

import json
import mimetypes
from pathlib import Path

from supabase import create_client

PROJECT_ROOT = Path(__file__).resolve().parents[1]
IMAGE_ROOT = Path("/mnt/d/PeerMart - Final Dataset/IMAGES")
MANIFEST_PATH = PROJECT_ROOT / "dataset" / "supabase_images_manifest.json"


def read_env():
    settings = {}

    for line in (PROJECT_ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            name, value = line.split("=", 1)
            settings[name.strip()] = value.strip().strip('"').strip("'")

    return settings


def main():
    settings = read_env()

    client = create_client(
        settings["SUPABASE_URL"],
        settings["SUPABASE_SERVICE_ROLE_KEY"],
    )

    bucket = settings["SUPABASE_BUCKET"]

    images = sorted(
        path for path in IMAGE_ROOT.rglob("*")
        if path.is_file()
        and path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )

    if len(images) != 122:
        raise RuntimeError(f"Expected 122 images, found {len(images)}")

    product_folders = {p.parent for p in images}

    if len(product_folders) != 56:
        raise RuntimeError("Expected 56 product image folders")

    print(f"PASS: Found {len(images)} images across 56 products", flush=True)

    # List existing objects so interrupted uploads can resume.
    existing = set()

    for category in sorted({p.relative_to(IMAGE_ROOT).parts[0] for p in images}):
        for product in sorted({
            p.relative_to(IMAGE_ROOT).parts[1]
            for p in images
            if p.relative_to(IMAGE_ROOT).parts[0] == category
        }):
            prefix = f"{category}/{product}"

            result = client.storage.from_(bucket).list(prefix)

            for obj in result:
                if obj.get("name"):
                    existing.add(f"{prefix}/{obj['name']}")

    manifest = []
    uploaded = 0
    skipped = 0

    for index, path in enumerate(images, start=1):
        object_path = path.relative_to(IMAGE_ROOT).as_posix()
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"

        if object_path in existing:
            skipped += 1
        else:
            with path.open("rb") as file:
                client.storage.from_(bucket).upload(
                    path=object_path,
                    file=file,
                    file_options={
                        "content-type": mime_type,
                        "upsert": "false",
                    },
                )
            uploaded += 1

        public_url = client.storage.from_(bucket).get_public_url(object_path)

        manifest.append({
            "object_path": object_path,
            "public_url": public_url,
        })

        print(f"[{index}/122] {object_path} OK", flush=True)

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")

    print("===== UPLOAD SUMMARY =====")
    print("New uploads:", uploaded)
    print("Already existed:", skipped)
    print("Total:", len(manifest))
    print("Manifest:", MANIFEST_PATH)
    print("PASS: Supabase image upload completed")


if __name__ == "__main__":
    main()
