from pathlib import Path
import yaml

source = Path("../docs/openapi.yaml")
spec = yaml.safe_load(source.read_text(encoding="utf-8"))
schemas = spec["components"]["schemas"]
paths = spec["paths"]

def ref(name):
    return {"$ref": f"#/components/schemas/{name}"}

def obj(properties, required=()):
    return {
        "type": "object",
        "properties": properties,
        "required": list(required),
    }

def paginated(item):
    return obj({
        "items": {"type": "array", "items": ref(item)},
        "page": {"type": "integer", "minimum": 1},
        "size": {"type": "integer", "minimum": 1},
        "total": {"type": "integer", "minimum": 0},
    }, ["items", "page", "size", "total"])

schemas.update({
    "AuthMessageResponse": obj({
        "message": {"type": "string"}
    }, ["message"]),
    "AuthLoginResponse": obj({
        "message": {"type": "string"},
        "user": ref("UserResponse"),
    }, ["message", "user"]),
    "SimilarListingListResponse": paginated("ListingResponse"),
    "SearchResultsResponse": paginated("ListingResponse"),
    "OrderResponse": obj({
        "sale_id": {"type": "integer"},
        "offer_id": {"type": "integer"},
        "final_price": {"type": "number"},
        "sold_at": {"type": "string", "format": "date-time"},
    }, ["sale_id", "offer_id", "final_price", "sold_at"]),
    "OrderListResponse": paginated("OrderResponse"),
})

# Use actual generated schema names where they differ.
print("Available response schemas:")
for name in sorted(schemas):
    if name.endswith("Response"):
        print(" ", name)

def success(path, method, status, schema=None):
    op = paths[path][method]
    op["responses"] = {
        code: response
        for code, response in op["responses"].items()
        if not (code.isdigit() and code.startswith("2"))
    }
    response = {"description": "Successful response"}
    if schema:
        response["content"] = {
            "application/json": {"schema": ref(schema)}
        }
    op["responses"][str(status)] = response

# Existing model response names will be checked before applying changes.
required_schemas = [
    "UserResponse", "ListingResponse", "OfferResponse",
    "ListingImageResponse",
]
missing = [name for name in required_schemas if name not in schemas]
if missing:
    raise SystemExit(
        "STOP: Response schema names differ: " + ", ".join(missing)
    )

success("/api/auth/register", "post", 201, "UserResponse")
success("/api/auth/login", "post", 200, "AuthLoginResponse")
success("/api/auth/logout", "post", 200, "AuthMessageResponse")
success("/api/users/me", "get", 200, "UserResponse")
success("/api/users/me", "patch", 200, "UserResponse")
success("/api/listings", "post", 201, "ListingResponse")
success("/api/listings/{id}", "patch", 200, "ListingResponse")
success("/api/listings/{id}", "delete", 204)
success("/api/listings/{id}/photos", "post", 201, "ListingImageResponse")
success("/api/listings/{id}/similar", "get", 200, "SimilarListingListResponse")
success("/api/search", "post", 200, "SearchResultsResponse")
success("/api/offers", "post", 201, "OfferResponse")
success("/api/offers/{id}", "patch", 200, "OfferResponse")
success("/api/orders", "post", 201, "OrderResponse")
success("/api/orders/mine", "get", 200, "OrderListResponse")
success("/api/users/me", "delete", 204)

# Path parameters for planned routes.
for path, methods in paths.items():
    if "{id}" not in path:
        continue
    for method, op in methods.items():
        if method not in {"get", "post", "patch", "delete", "put"}:
            continue
        if op.get("x-implementation-status") != "planned":
            continue
        params = op.setdefault("parameters", [])
        if not any(p.get("name") == "id" for p in params):
            params.append({
                "name": "id",
                "in": "path",
                "required": True,
                "schema": {"type": "integer", "minimum": 1},
            })

# Pagination for planned list-returning endpoints.
for path, method in [
    ("/api/listings/{id}/similar", "get"),
    ("/api/orders/mine", "get"),
]:
    params = paths[path][method].setdefault("parameters", [])
    for name, default in [("page", 1), ("size", 10)]:
        if not any(p.get("name") == name for p in params):
            params.append({
                "name": name,
                "in": "query",
                "required": False,
                "schema": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 50 if name == "size" else 1000000,
                    "default": default,
                },
            })

source.write_text(
    yaml.safe_dump(spec, sort_keys=False, allow_unicode=True),
    encoding="utf-8",
)

print("PASS: Planned success response schemas completed")
print("PASS: HTTP success codes corrected")
print("PASS: Path parameters added")
print("PASS: Planned list pagination added")
print("Saved:", source)
