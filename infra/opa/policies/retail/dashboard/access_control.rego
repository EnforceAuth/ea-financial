package retail.dashboard.access_control

import rego.v1

import data.retail.retail_api.authentication

# Dashboard roles and permissions
dashboard_roles := {
	"manager": ["view_all", "edit_all", "export_data", "admin_panel"],
	"senior_representative": ["view_all", "edit_assigned", "export_data"],
	"representative": ["view_assigned", "edit_assigned"],
	"analyst": ["view_all"],
}

# Allow dashboard access based on role
allow_dashboard_access if {
	user_claims := authentication.authenticated_claims
	user_claims.role in ["manager", "senior_representative", "representative"]
}

# Allow viewing customer data
allow_view_customer if {
	user_claims := authentication.authenticated_claims
	customer_id := input.request.query.customer_id

	# Check if user has view permissions
	"view_all" in dashboard_roles[user_claims.role]
}

allow_view_customer if {
	user_claims := authentication.authenticated_claims
	customer_id := input.request.query.customer_id

	# Representatives can only view assigned customers
	"view_assigned" in dashboard_roles[user_claims.role]
	customer_id in data.user_customers[user_claims.sub]
}

# Allow editing customer information
allow_edit_customer if {
	user_claims := authentication.authenticated_claims
	customer_id := input.request.body.customer_id

	"edit_all" in dashboard_roles[user_claims.role]
}

allow_edit_customer if {
	user_claims := authentication.authenticated_claims
	customer_id := input.request.body.customer_id

	"edit_assigned" in dashboard_roles[user_claims.role]
	customer_id in data.user_customers[user_claims.sub]
}

# Allow exporting data
allow_export_data if {
	user_claims := authentication.authenticated_claims
	"export_data" in dashboard_roles[user_claims.role]
}

# Allow admin panel access (manager only)
allow_admin_panel if {
	user_claims := authentication.authenticated_claims
	"admin_panel" in dashboard_roles[user_claims.role]
}

# Allow viewing reports
allow_view_reports if {
	user_claims := authentication.authenticated_claims
	user_claims.role in ["manager", "senior_representative", "analyst"]
}
