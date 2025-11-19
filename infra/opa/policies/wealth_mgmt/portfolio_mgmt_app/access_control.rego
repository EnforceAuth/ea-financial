package wealth_mgmt.portfolio_mgmt_app.access_control

import rego.v1

import data.wealth_mgmt.investing_api.authentication

# Portfolio Management App - client-facing and advisor interface

# App access tiers
app_access_tiers := {
	"managing_director": ["full_access", "admin", "analytics", "reporting"],
	"portfolio_manager": ["full_access", "analytics", "reporting"],
	"senior_advisor": ["client_management", "analytics", "reporting"],
	"advisor": ["client_management", "reporting"],
	"client": ["view_only", "documents"],
}

# Allow app access based on role
allow_app_access if {
	user_claims := authentication.authenticated_claims
	user_claims.role in [
		"managing_director",
		"portfolio_manager",
		"senior_advisor",
		"advisor",
		"client",
	]
}

# Client portal access (clients can view their own portfolio)
allow_client_portal if {
	user_claims := authentication.authenticated_claims
	user_claims.role == "client"

	# Clients can only see their own data
	requested_client_id := input.request.query.client_id
	user_claims.client_id == requested_client_id
}

# Advisor workspace
allow_advisor_workspace if {
	user_claims := authentication.authenticated_claims
	"client_management" in app_access_tiers[user_claims.role]
}

# Portfolio analytics tools
allow_analytics_tools if {
	user_claims := authentication.authenticated_claims
	"analytics" in app_access_tiers[user_claims.role]
}

# Document center access
allow_document_access if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/documents")

	"documents" in app_access_tiers[user_claims.role]
}

# Performance reporting
allow_performance_reports if {
	user_claims := authentication.authenticated_claims
	"reporting" in app_access_tiers[user_claims.role]
}

# Client communication (secure messaging)
allow_messaging if {
	user_claims := authentication.authenticated_claims
	input.request.http.path in ["/messages", "/messages/send"]

	user_claims.role in ["advisor", "senior_advisor", "portfolio_manager", "client"]
}

# Meeting scheduler
allow_scheduling if {
	user_claims := authentication.authenticated_claims
	startswith(input.request.http.path, "/meetings")

	user_claims.role in ["advisor", "senior_advisor", "portfolio_manager", "client"]
}
