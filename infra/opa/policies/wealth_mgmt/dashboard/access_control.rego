package wealth_mgmt.dashboard.access_control

import rego.v1

import data.wealth_mgmt.investing_api.authentication

# Wealth management dashboard - comprehensive view for advisors

# Dashboard features by role
dashboard_features := {
	"managing_director": [
		"firm_overview",
		"all_advisors",
		"all_clients",
		"firm_analytics",
		"compliance_dashboard",
		"admin_tools",
	],
	"portfolio_manager": [
		"team_overview",
		"assigned_advisors",
		"team_clients",
		"team_analytics",
		"risk_dashboard",
	],
	"senior_advisor": [
		"client_portfolio",
		"client_analytics",
		"trade_dashboard",
		"performance_reports",
	],
	"advisor": [
		"client_portfolio",
		"basic_analytics",
		"trade_dashboard",
	],
}

# Allow dashboard access
allow_dashboard_access if {
	user_claims := authentication.authenticated_claims
	user_claims.role in ["managing_director", "portfolio_manager", "senior_advisor", "advisor"]
}

# Feature access control
allow_feature if {
	user_claims := authentication.authenticated_claims
	feature := input.request.query.feature
	feature in dashboard_features[user_claims.role]
}

# Firm-wide overview (managing director only)
allow_firm_overview if {
	user_claims := authentication.authenticated_claims
	"firm_overview" in dashboard_features[user_claims.role]
}

# Team management
allow_team_management if {
	user_claims := authentication.authenticated_claims
	"team_overview" in dashboard_features[user_claims.role]
}

# Client book access
allow_client_book if {
	user_claims := authentication.authenticated_claims
	"client_portfolio" in dashboard_features[user_claims.role]
}

# Compliance dashboard
allow_compliance_view if {
	user_claims := authentication.authenticated_claims
	"compliance_dashboard" in dashboard_features[user_claims.role]
}
