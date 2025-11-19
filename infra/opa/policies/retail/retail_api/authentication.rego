package retail.retail_api.authentication

import rego.v1

# Extract bearer token from authorization header
extract_token := token if {
	auth_header := input.request.http.headers.authorization
	startswith(auth_header, "Bearer ")
	token := substring(auth_header, 7, -1)
}

# Validate JWT token (simplified - in production use proper JWT validation)
valid_token(token) if {
	token != ""
	token != null
}

# Extract claims from JWT token (mock implementation)
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
	}
}

# Check if user is active
user_active(user_claims) if {
	user_claims.active == true
}

# Helper function to get authenticated user claims
authenticated_claims := user_claims if {
	token := extract_token
	valid_token(token)
	user_claims := claims(token)
	user_active(user_claims)
}

# Allow login attempts (no authentication required for login endpoint)
allow_login if {
	input.request.http.method == "POST"
	input.request.http.path == "/auth/login"
}

# Allow logout
allow_logout if {
	input.request.http.method == "POST"
	input.request.http.path == "/auth/logout"
	authenticated_claims
}

# Allow token verification
allow_verify if {
	input.request.http.method == "GET"
	input.request.http.path == "/auth/verify"
	authenticated_claims
}
