package ea_financial.identity_provider.sso

import rego.v1

# Single Sign-On policies for EA Financial - central authentication

# SSO providers
allowed_sso_providers := ["okta", "azure_ad", "google_workspace"]

# Allow SSO login initiation
allow_sso_login if {
	input.request.http.method == "GET"
	input.request.http.path == "/sso/login"

	provider := input.request.query.provider
	provider in allowed_sso_providers
}

# Allow SSO callback
allow_sso_callback if {
	input.request.http.method == "POST"
	input.request.http.path == "/sso/callback"

	# Verify state parameter for CSRF protection
	input.request.body.state != null
}

# SAML assertion processing
allow_saml_assertion if {
	input.request.http.method == "POST"
	input.request.http.path == "/sso/saml/acs"

	# Verify SAML response
	input.request.body.SAMLResponse != null
}

# OAuth2 token exchange
allow_oauth_token if {
	input.request.http.method == "POST"
	input.request.http.path == "/sso/oauth/token"

	# Verify authorization code
	input.request.body.code != null
	input.request.body.client_id != null
}

# Session management
allow_session_refresh if {
	input.request.http.method == "POST"
	input.request.http.path == "/sso/session/refresh"

	# Valid refresh token required
	input.request.body.refresh_token != null
}

# Logout from all systems
allow_sso_logout if {
	input.request.http.method == "POST"
	input.request.http.path == "/sso/logout"

	# Authenticated user can logout
	input.request.http.headers.authorization != null
}

# Cross-organization authentication
allow_cross_org_auth if {
	# Users can access multiple organizations within EA Financial
	user_orgs := data.user_organizations[input.user.sub]
	requested_org := input.request.body.organization_id
	requested_org in user_orgs
}
