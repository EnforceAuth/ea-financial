package commercial.dashboard.access_control

import rego.v1

import data.commercial.wholesale_api.authentication

# Commercial dashboard - relationship managers and treasury officers

# Dashboard roles specific to commercial banking
dashboard_roles := {
	"svp": ["view_all", "approve_all", "admin_panel", "analytics"],
	"vp": ["view_all", "approve_large", "analytics"],
	"senior_manager": ["view_all", "approve_medium", "analytics"],
	"relationship_manager": ["view_assigned", "request_approval"],
	"treasury_officer": ["view_treasury", "execute_treasury"],
	"compliance_officer": ["view_all", "compliance_tools"],
}

# Allow dashboard access for commercial users
allow_dashboard_access if {
	user_claims := authentication.authenticated_claims
	user_claims.role in [
		"svp",
		"vp",
		"senior_manager",
		"relationship_manager",
		"treasury_officer",
		"compliance_officer",
	]
}

# Client portfolio access
allow_view_client if {
	user_claims := authentication.authenticated_claims
	client_id := input.request.query.client_id

	"view_all" in dashboard_roles[user_claims.role]
}

allow_view_client if {
	user_claims := authentication.authenticated_claims
	client_id := input.request.query.client_id

	"view_assigned" in dashboard_roles[user_claims.role]
	client_id in data.rm_clients[user_claims.sub]
}

# Approval workflows
allow_approval_workflow if {
	user_claims := authentication.authenticated_claims
	approval_type := dashboard_roles[user_claims.role][_]
	startswith(approval_type, "approve_")
}

# Treasury dashboard access
allow_treasury_dashboard if {
	user_claims := authentication.authenticated_claims
	"view_treasury" in dashboard_roles[user_claims.role]
}

# Compliance dashboard access
allow_compliance_dashboard if {
	user_claims := authentication.authenticated_claims
	"compliance_tools" in dashboard_roles[user_claims.role]
}
