package commercial.wholesale_api.authentication

import rego.v1

# Commercial banking uses enhanced authentication with MFA

# Extract bearer token from authorization header
extract_token := token if {
	auth_header := input.request.http.headers.authorization
	startswith(auth_header, "Bearer ")
	token := substring(auth_header, 7, -1)
}

# Validate JWT token with enhanced security
valid_token(token) if {
	token != ""
	token != null

	# Commercial banking requires stronger token validation
	count(token) >= 100 # Longer tokens for corporate accounts
}

# Extract claims from JWT token
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
		"client_id": user.client_id, # Corporate client association
	}
}

# Check if user is active and MFA verified
user_active(user_claims) if {
	user_claims.active == true
	user_claims.mfa_verified == true # Commercial requires MFA
}

# Helper function to get authenticated user claims
authenticated_claims := user_claims if {
	token := extract_token
	valid_token(token)
	user_claims := claims(token)
	user_active(user_claims)
}

# Allow login with MFA
allow_login if {
	input.request.http.method == "POST"
	input.request.http.path == "/auth/login"
	input.request.body.mfa_code != null
}

# Allow token refresh
allow_token_refresh if {
	input.request.http.method == "POST"
	input.request.http.path == "/auth/refresh"
	authenticated_claims
}
