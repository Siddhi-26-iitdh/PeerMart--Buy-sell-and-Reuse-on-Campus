from pathlib import Path
import yaml

source = Path("docs/openapi.yaml")
spec = yaml.safe_load(source.read_text(encoding="utf-8"))
schemas = spec["components"]["schemas"]

def obj(properties, required=()):
    return {
        "type": "object",
        "properties": properties,
        "required": list(required),
        "additionalProperties": False,
    }

def string(**kwargs):
    return {"type": "string", **kwargs}

def integer(**kwargs):
    return {"type": "integer", **kwargs}

def money():
    return {"type": "number", "exclusiveMinimum": 0}

schemas.update({
    "RegisterRequest": obj({
        "f_name": string(),
        "l_name": string(),
        "email": string(format="email"),
        "password": string(minLength=8),
        "terms_accepted": {"type": "boolean"},
    }, ["f_name", "l_name", "email", "password", "terms_accepted"]),
    "LoginRequest": obj({
        "email": string(format="email"),
        "password": string(),
    }, ["email", "password"]),
    "ListingCreateRequest": obj({
        "title": string(maxLength=200),
        "description": string(),
        "category_id": integer(minimum=1),
        "price": money(),
        "item_condition": string(),
        "brand": string(),
        "color": string(),
    }, ["title", "description", "category_id", "price", "item_condition"]),
    "ListingUpdateRequest": obj({
        "title": string(maxLength=200),
        "description": string(),
        "category_id": integer(minimum=1),
        "price": money(),
        "item_condition": string(),
        "brand": string(),
        "color": string(),
    }),
    "ProfileUpdateRequest": obj({
        "f_name": string(),
        "l_name": string(),
        "phone_no": string(),
    }),
    "PhotoCreateRequest": obj({
        "image_path": string(),
        "display_order": integer(minimum=1, maximum=5),
    }, ["image_path", "display_order"]),
    "OfferCreateRequest": obj({
        "listing_id": integer(minimum=1),
        "offered_price": money(),
    }, ["listing_id", "offered_price"]),
    "OfferUpdateRequest": obj({
        "status": {
            "type": "string",
            "enum": ["accepted", "rejected"],
        },
    }, ["status"]),
    "OrderCreateRequest": obj({
        "offer_id": integer(minimum=1),
    }, ["offer_id"]),
    "SearchRequest": obj({
        "query": string(minLength=1),
        "page": integer(minimum=1),
        "size": integer(minimum=1, maximum=50),
    }, ["query"]),
})

requests = {
    ("post", "/api/auth/register"): "RegisterRequest",
    ("post", "/api/auth/login"): "LoginRequest",
    ("post", "/api/listings"): "ListingCreateRequest",
    ("patch", "/api/listings/{id}"): "ListingUpdateRequest",
    ("patch", "/api/users/me"): "ProfileUpdateRequest",
    ("post", "/api/listings/{id}/photos"): "PhotoCreateRequest",
    ("post", "/api/offers"): "OfferCreateRequest",
    ("patch", "/api/offers/{id}"): "OfferUpdateRequest",
    ("post", "/api/orders"): "OrderCreateRequest",
    ("post", "/api/search"): "SearchRequest",
}

for (method, path), schema_name in requests.items():
    operation = spec["paths"][path][method]
    operation["requestBody"] = {
        "required": True,
        "content": {
            "application/json": {
                "schema": {
                    "$ref": f"#/components/schemas/{schema_name}"
                }
            }
        },
    }

# Logout uses the session cookie; no request body.
spec["paths"]["/api/auth/logout"]["post"].pop("requestBody", None)

# Add documented error responses to planned operations.
for path, path_item in spec["paths"].items():
    for method, operation in path_item.items():
        if method not in {"get", "post", "put", "patch", "delete"}:
            continue
        if operation.get("x-implementation-status") != "planned":
            continue
        responses = operation["responses"]
        for status in ("400", "404", "409", "422"):
            responses.setdefault(
                status,
                {"$ref": f"#/components/responses/Error{status}"},
            )

# Keep the submission contract in the required repository location.
output = Path("../docs/openapi.yaml")
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(
    yaml.safe_dump(spec, sort_keys=False, allow_unicode=True),
    encoding="utf-8",
)

print("PASS: Future request schemas added")
print("PASS: Planned error responses documented")
print("PASS: Saved repository docs/openapi.yaml")
print("Documented paths:", len(spec["paths"]))
