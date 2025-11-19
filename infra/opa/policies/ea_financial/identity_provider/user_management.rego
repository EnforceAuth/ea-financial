package ea_financial.identity_provider.user_management

import rego.v1

# User provisioning and management

# Admin roles that can manage users
admin_roles := ["identity_admin", "super_admin", "hr_admin"]

# Allow viewing users
allow_view_users if {
	user_claims := input.user_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/users")

	user_claims.role in admin_roles
	"users:read" in user_claims.permissions
}

# Allow creating users
allow_create_user if {
	user_claims := input.user_claims
	input.request.http.method == "POST"
	input.request.http.path == "/users"

	user_claims.role in admin_roles
	"users:create" in user_claims.permissions
}

# Allow updating user details
allow_update_user if {
	user_claims := input.user_claims
	input.request.http.method in ["PUT", "PATCH"]
	startswith(input.request.http.path, "/users/")

	user_claims.role in admin_roles
	"users:update" in user_claims.permissions
}

# Allow deactivating users
allow_deactivate_user if {
	user_claims := input.user_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/deactivate")

	user_claims.role in ["identity_admin", "super_admin"]
	"users:deactivate" in user_claims.permissions
}

# Users can update their own profile
allow_self_update if {
	user_claims := input.user_claims
	input.request.http.method == "PATCH"
	user_id := extract_user_id(input.request.http.path)

	user_claims.sub == user_id

	# Limited fields for self-update
	allowed_fields := {"email", "phone", "display_name", "preferences"}
	update_fields := {field | some field in object.keys(input.request.body)}
	count(update_fields - allowed_fields) == 0
}

# Extract user ID from path
extract_user_id(path) := user_id if {
	path_parts := split(trim(path, "/"), "/")
	count(path_parts) >= 2
	path_parts[0] == "users"
	user_id := path_parts[1]
}

# Role assignment (super admin only)
allow_role_assignment if {
	user_claims := input.user_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/roles")

	user_claims.role == "super_admin"
	"users:assign_roles" in user_claims.permissions
}

# Group management
allow_group_management if {
	user_claims := input.user_claims
	input.request.http.method in ["GET", "POST", "PUT", "DELETE"]
	startswith(input.request.http.path, "/groups")

	user_claims.role in admin_roles
	"groups:manage" in user_claims.permissions
}
