package ea_financial.identity_provider.mfa

import rego.v1

# Multi-factor authentication policies

# MFA methods
allowed_mfa_methods := ["totp", "sms", "email", "hardware_token", "biometric"]

# MFA requirement by organization
mfa_requirements := {
	"retail": ["totp", "sms"],
	"commercial": ["totp", "hardware_token"],
	"wealth_mgmt": ["totp", "hardware_token", "biometric"],
}

# Require MFA for sensitive operations
mfa_required if {
	input.request.http.path in [
		"/admin",
		"/users/create",
		"/users/deactivate",
		"/roles/assign",
	]
}

# Allow MFA enrollment
allow_mfa_enrollment if {
	input.request.http.method == "POST"
	input.request.http.path == "/mfa/enroll"

	# User must be authenticated to enroll
	input.user_claims.sub != null

	# Verify method is allowed
	method := input.request.body.method
	method in allowed_mfa_methods
}

# Allow MFA verification
allow_mfa_verify if {
	input.request.http.method == "POST"
	input.request.http.path == "/mfa/verify"

	# Code required
	input.request.body.code != null
	input.request.body.method != null
}

# Allow MFA method management
allow_mfa_management if {
	user_claims := input.user_claims
	input.request.http.method in ["GET", "DELETE"]
	startswith(input.request.http.path, "/mfa/methods")

	# Users can manage their own MFA methods
	user_id := extract_user_id(input.request.http.path)
	user_claims.sub == user_id
}

# Extract user ID from path
extract_user_id(path) := user_id if {
	path_parts := split(trim(path, "/"), "/")
	user_id := path_parts[2] # /mfa/methods/{user_id}
}

# Backup codes generation
allow_backup_codes if {
	user_claims := input.user_claims
	input.request.http.method == "POST"
	input.request.http.path == "/mfa/backup-codes"

	# User can generate backup codes for themselves
	user_claims.sub != null
}

# Admin can reset user MFA
allow_mfa_reset if {
	user_claims := input.user_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/mfa/reset")

	user_claims.role in ["identity_admin", "super_admin"]
	"mfa:reset" in user_claims.permissions
}

# Verify MFA status for organization requirements
verify_mfa_compliance if {
	user_claims := input.user_claims
	user_org := data.user_organizations[user_claims.sub][0]
	required_methods := mfa_requirements[user_org]

	# User has at least one required method enrolled
	user_methods := data.user_mfa_methods[user_claims.sub]
	some method in user_methods
	method in required_methods
}
