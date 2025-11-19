package wealth_mgmt.investing_api.portfolio_management

import rego.v1

import data.wealth_mgmt.investing_api.authentication

# Portfolio access and management policies

# Asset under management (AUM) tiers
aum_tiers := {
	"advisor": 10000000, # $10M
	"senior_advisor": 50000000, # $50M
	"portfolio_manager": 100000000, # $100M
	"managing_director": 500000000, # $500M
}

# Allow viewing client portfolios
allow_view_portfolio if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/portfolios/")
	client_id := extract_client_id(input.request.http.path)

	# Advisor can view assigned clients
	client_id in data.advisor_clients[user_claims.advisor_id]
	"portfolio:read" in user_claims.permissions
}

# Allow portfolio rebalancing
allow_rebalance if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/rebalance")

	"portfolio:rebalance" in user_claims.permissions
	authentication.has_license("series_65") # Investment advisor license
}

# Allow portfolio allocation changes
allow_allocation_change if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "PUT"
	contains(input.request.http.path, "/allocation")

	client_id := extract_client_id(input.request.http.path)
	client_id in data.advisor_clients[user_claims.advisor_id]

	"portfolio:manage" in user_claims.permissions
}

# Performance analytics
allow_performance_analytics if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	contains(input.request.http.path, "/analytics")

	"portfolio:analytics" in user_claims.permissions
}

# Risk assessment
allow_risk_assessment if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	contains(input.request.http.path, "/risk-assessment")

	"portfolio:risk" in user_claims.permissions
}

# Extract client ID from path
extract_client_id(path) := client_id if {
	path_parts := split(trim(path, "/"), "/")
	count(path_parts) >= 2
	path_parts[0] == "portfolios"
	client_id := path_parts[1]
}
