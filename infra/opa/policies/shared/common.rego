package shared.common

import rego.v1

# Common utility functions and policies shared across all organizations

# Default deny
default allow := false

# Allow health checks from anywhere
allow if {
	input.request.http.method == "GET"
	input.request.http.path in ["/health", "/healthz", "/ready", "/status"]
}

# Allow OPTIONS requests (CORS preflight)
allow if {
	input.request.http.method == "OPTIONS"
}

# Extract HTTP method
http_method := input.request.http.method

# Extract path
http_path := input.request.http.path

# Common HTTP methods to actions mapping
method_to_action(method) := action if {
	method_map := {
		"GET": "read",
		"POST": "create",
		"PUT": "update",
		"PATCH": "update",
		"DELETE": "delete",
	}
	action := method_map[method]
}

# Check if path matches pattern
path_matches(pattern) if {
	glob.match(pattern, ["/"], input.request.http.path)
}

# Extract resource from path (generic)
extract_resource(path) := resource if {
	path_parts := split(trim(path, "/"), "/")
	count(path_parts) > 0
	resource := path_parts[0]
}

# Extract ID from path (assumes /resource/{id} pattern)
extract_id(path) := id if {
	path_parts := split(trim(path, "/"), "/")
	count(path_parts) >= 2
	id := path_parts[1]
}

# Check if user has permission
has_permission(user_claims, permission) if {
	permission in user_claims.permissions
}

# Check if user has role
has_role(user_claims, role) if {
	user_claims.role == role
}

# Check if user has any of the roles
has_any_role(user_claims, roles) if {
	user_claims.role in roles
}

# Time-based helpers
current_hour := ((time.now_ns() / 1000000000) / 3600) % 24

# Business hours check (default 6 AM - 10 PM)
within_business_hours if {
	current_hour >= 6
	current_hour <= 22
}

# Audit log structure
audit_log(user_claims, allowed) := log if {
	user_claims != null
	log := {
		"timestamp": time.now_ns(),
		"user": user_claims.sub,
		"role": user_claims.role,
		"method": input.request.http.method,
		"path": input.request.http.path,
		"allowed": allowed,
		"ip_address": input.request.http.headers["x-forwarded-for"],
		"user_agent": input.request.http.headers["user-agent"],
	}
}

# Audit log for unauthenticated requests
audit_log(user_claims, allowed) := log if {
	user_claims == null
	log := {
		"timestamp": time.now_ns(),
		"user": "unauthenticated",
		"role": "none",
		"method": input.request.http.method,
		"path": input.request.http.path,
		"allowed": allowed,
		"ip_address": input.request.http.headers["x-forwarded-for"],
		"user_agent": input.request.http.headers["user-agent"],
	}
}
