from pathlib import Path
import yaml

from app.main import app

spec = app.openapi()

error_schema = {
    "type": "object",
    "required": ["error"],
    "properties": {
        "error": {
            "type": "object",
            "required": ["code", "message", "details"],
            "properties": {
                "code": {"type": "string"},
                "message": {"type": "string"},
                "details": {"nullable": True},
            },
        }
    },
}

components = spec.setdefault("components", {})
schemas = components.setdefault("schemas", {})
schemas["Error"] = error_schema

components.setdefault("securitySchemes", {})["cookieAuth"] = {
    "type": "apiKey",
    "in": "cookie",
    "name": "session",
}

error_responses = components.setdefault("responses", {})
for status, description in {
    "400": "Bad request",
    "401": "Authentication required",
    "403": "Forbidden",
    "404": "Not found",
    "409": "Conflict",
    "422": "Validation error",
}.items():
    error_responses[f"Error{status}"] = {
        "description": description,
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/Error"}
            }
        },
    }

# Standardize the list response field name.
for name, schema in schemas.items():
    if name.endswith("ListResponse"):
        properties = schema.get("properties", {})
        if "page_size" in properties:
            properties["size"] = properties.pop("page_size")
            schema["required"] = [
                "size" if field == "page_size" else field
                for field in schema.get("required", [])
            ]

# Document the planned API endpoints.
def add_operation(path, method, summary, tag, secured=False, body=False):
    operation = {
        "tags": [tag],
        "summary": summary,
        "operationId": f"planned_{method}_{path.strip('/').replace('/', '_').replace('{', '').replace('}', '')}",
        "responses": {
            "201" if method == "post" else "204" if method == "delete" else "200": {
                "description": "Successful response"
            },
            "422": {"$ref": "#/components/responses/Error422"},
        },
        "x-implementation-status": "planned",
    }

    if secured:
        operation["security"] = [{"cookieAuth": []}]
        for status in ("401", "403"):
            operation["responses"][status] = {
                "$ref": f"#/components/responses/Error{status}"
            }

    if body:
        operation["requestBody"] = {
            "required": True,
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "additionalProperties": True,
                    }
                }
            },
        }

    spec.setdefault("paths", {}).setdefault(path, {})[method] = operation


planned = [
    ("/api/auth/register", "post", "Register a user", "Authentication", False, True),
    ("/api/auth/login", "post", "Log in", "Authentication", False, True),
    ("/api/auth/logout", "post", "Log out", "Authentication", True, False),
    ("/api/users/me", "get", "Get my profile", "Users", True, False),
    ("/api/users/me", "patch", "Update my profile", "Users", True, True),
    ("/api/users/me", "delete", "Delete my account", "Users", True, False),
    ("/api/listings", "post", "Create listing", "Listings", True, True),
    ("/api/listings/{id}", "patch", "Update listing", "Listings", True, True),
    ("/api/listings/{id}", "delete", "Delete listing", "Listings", True, False),
    ("/api/listings/{id}/photos", "post", "Upload listing photo", "Listing Images", True, True),
    ("/api/listings/{id}/similar", "get", "Find similar listings using AI", "AI", False, False),
    ("/api/search", "post", "AI-assisted search", "AI", False, True),
    ("/api/offers", "post", "Submit an offer", "Offers", True, True),
    ("/api/offers/{id}", "patch", "Respond to an offer", "Offers", True, True),
    ("/api/orders", "post", "Complete a purchase", "Sales", True, True),
    ("/api/orders/mine", "get", "List my purchases", "Sales", True, False),
]

for args in planned:
    add_operation(*args)

# Apply shared error responses to existing operations.
for path, path_item in spec["paths"].items():
    for method, operation in path_item.items():
        if method not in {"get", "post", "put", "patch", "delete"}:
            continue

        if operation.get("x-implementation-status") == "planned":
            continue

        responses = operation.setdefault("responses", {})
        for status in ("400", "404", "422"):
            if status in responses or status == "422":
                responses[status] = {
                    "$ref": f"#/components/responses/Error{status}"
                }

output = Path(__file__).with_name("openapi.yaml")
output.write_text(
    yaml.safe_dump(spec, sort_keys=False, allow_unicode=True),
    encoding="utf-8",
)

print("OpenAPI version:", spec["openapi"])
print("Total documented paths:", len(spec["paths"]))
print("Planned operations:", len(planned))
print("Saved:", output)
