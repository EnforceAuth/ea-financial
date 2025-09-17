package main

import rego.v1

# Default deny
default allow := false

# Allow health checks
allow if {
	input.request.http.method == "GET"
	input.request.http.path == "/health"
}

# Allow status checks
allow if {
	input.request.http.method == "GET"
	input.request.http.path == "/status"
}

# Allow root endpoint access
allow if {
	input.request.http.method == "GET"
	input.request.http.path == "/"
}

# Allow OPTIONS requests (CORS preflight)
allow if {
	input.request.http.method == "OPTIONS"
}

# Helper function to get authenticated user claims
authenticated_claims := user_claims if {
	token := extract_token
	valid_token(token)
	user_claims := claims(token)
	user_active(user_claims)
}

# Main authorization logic
allow if {
	user_claims := authenticated_claims
	has_permission(user_claims, input.request)
}

# Role-based access control - managers have full access
allow if {
	user_claims := authenticated_claims
	user_claims.role == "manager"
}

# Senior representatives have elevated access (except admin operations)
allow if {
	user_claims := authenticated_claims
	user_claims.role == "senior_representative"
	not is_admin_operation(input.request)
}

# Extract bearer token from authorization header
extract_token := token if {
	auth_header := input.request.http.headers.authorization
	startswith(auth_header, "Bearer ")
	token := substring(auth_header, 7, -1)
}

# Validate JWT token (simplified - in production use proper JWT validation)
valid_token(token) if {
	# For mock tokens, just check they're not empty
	# In production, properly validate JWT format and signature
	token != ""
	token != null
}

# Extract claims from JWT token (mock implementation)
claims(token) := user_claims if {
	# In production, properly decode and verify JWT
	# This is a mock implementation for demo purposes
	users := data.users

	# For demo, extract username from a simple token format
	# In production, decode the JWT properly
	parts := split(token, ".")

	# Mock: use token as username lookup for demo
	some username, user in users
	user.token == token

	user_claims := {
		"sub": username,
		"role": user.role,
		"permissions": user.permissions,
		"department": user.department,
		"active": user.active,
		"exp": user.exp,
	}
}

# Check if user is active
user_active(user_claims) if {
	user_claims.active == true
}

# Permission checking logic
has_permission(user_claims, request) if {
	method := request.http.method
	path := request.http.path

	# Extract resource and action
	resource := extract_resource(path)
	action := method_to_action(method)

	# Check if user has required permission
	required_permission := sprintf("%s:%s", [resource, action])
	required_permission in user_claims.permissions
}

# Extract resource from path
extract_resource(path) := resource if {
	path_parts := split(trim(path, "/"), "/")

	# Route-based resource mapping
	resource := route_to_resource(path_parts)
}

# Map routes to resources
route_to_resource(parts) := "auth" if {
	parts[0] == "auth"
}

route_to_resource(parts) := "accounts" if {
	parts[0] == "accounts"
}

route_to_resource(parts) := "terms" if {
	parts[0] == "terms"
}

route_to_resource(parts) := "transactions" if {
	parts[0] == "accounts"
	count(parts) >= 3
	parts[2] == "transactions"
}

route_to_resource(parts) := "balance" if {
	parts[0] == "accounts"
	count(parts) >= 3
	parts[2] == "balance"
}

route_to_resource(parts) := "debit" if {
	parts[0] == "accounts"
	count(parts) >= 3
	parts[2] == "debit"
}

route_to_resource(parts) := "credit" if {
	parts[0] == "accounts"
	count(parts) >= 3
	parts[2] == "credit"
}

# Default to general API resource
route_to_resource(parts) := "api" if {
	not parts[0] == "auth"
	not parts[0] == "accounts"
	not parts[0] == "terms"
}

# Map HTTP methods to actions
method_to_action("GET") := "read"

method_to_action("POST") := "create"

method_to_action("PUT") := "update"

method_to_action("DELETE") := "delete"

method_to_action("PATCH") := "update"

# Check if operation requires admin privileges
is_admin_operation(request) if {
	request.http.method == "DELETE"
}

is_admin_operation(request) if {
	contains(request.http.path, "/admin")
}

# Account access control - users can only access accounts they're assigned to
account_access_allowed(user_claims, account_id) if {
	# Managers can access any account
	user_claims.role == "manager"
}

account_access_allowed(user_claims, account_id) if {
	# Users can access accounts in their assigned list
	account_id in data.user_accounts[user_claims.sub]
}

# Time-based access control
time_based_access_allowed if {
	# Get current time (in production, use time.now_ns())
	current_hour := 9 # Mock current hour

	# Banking hours: 6 AM to 10 PM
	current_hour >= 6
	current_hour <= 22
}

# Compliance logging for sensitive operations
log_decision := {
	"timestamp": time.now_ns(),
	"user": user_claims.sub,
	"role": user_claims.role,
	"resource": extract_resource(input.request.http.path),
	"action": method_to_action(input.request.http.method),
	"allowed": allow,
	"reason": decision_reason,
} if {
	user_claims := authenticated_claims
}

# Decision reasoning for audit trails
decision_reason := "allowed_manager" if {
	user_claims := authenticated_claims
	user_claims.role == "manager"
	allow
}

decision_reason := "allowed_permission" if {
	user_claims := authenticated_claims
	has_permission(user_claims, input.request)
	allow
}

decision_reason := "denied_inactive_user" if {
	token := extract_token
	valid_token(token)
	user_claims := claims(token)
	not user_active(user_claims)
	not allow
}

decision_reason := "denied_insufficient_permissions" if {
	user_claims := authenticated_claims
	not has_permission(user_claims, input.request)
	not allow
}

decision_reason := "denied_no_token" if {
	not extract_token
	not allow
}

decision_reason := "denied_invalid_token" if {
	extract_token
	not valid_token(extract_token)
	not allow
}
