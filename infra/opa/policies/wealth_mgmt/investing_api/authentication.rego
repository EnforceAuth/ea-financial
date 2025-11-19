package wealth_mgmt.investing_api.authentication

import rego.v1

# Wealth management authentication - highest security tier

# Extract bearer token
extract_token := token if {
	auth_header := input.request.http.headers.authorization
	startswith(auth_header, "Bearer ")
	token := substring(auth_header, 7, -1)
}

# Validate token with strict requirements
valid_token(token) if {
	token != ""
	token != null
	count(token) >= 150 # Longest tokens for wealth management
}

# Extract claims with wealth-specific fields
claims(token) := user_claims if {
	users := data.users
	some username, user in users
	user.token == token

	user_claims := {
		"sub": username,
		"role": user.role,
		"permissions": user.permissions,
		"department": user.department,
		"active": user.active,
		"exp": user.exp,
		"mfa_verified": user.mfa_verified,
		"client_id": user.client_id,
		"advisor_id": user.advisor_id,
		"licenses": user.licenses, # Series 7, 63, 65, etc.
	}
}

# Verify user is active with valid licenses
user_active(user_claims) if {
	user_claims.active == true
	user_claims.mfa_verified == true
	count(user_claims.licenses) > 0
}

# Helper function to get authenticated user claims
authenticated_claims := user_claims if {
	token := extract_token
	valid_token(token)
	user_claims := claims(token)
	user_active(user_claims)
}

# Verify advisor has required licenses
has_license(license_type) if {
	user_claims := authenticated_claims
	license_type in user_claims.licenses
}

# Allow login with MFA and biometrics
allow_login if {
	input.request.http.method == "POST"
	input.request.http.path == "/auth/login"
	input.request.body.mfa_code != null
	input.request.body.biometric_verified == true
}
