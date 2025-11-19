package retail.dashboard.ui_features

import rego.v1

import data.retail.retail_api.authentication

# Feature flags for different roles
ui_features := {
	"manager": [
		"account_management",
		"transaction_history",
		"customer_profiles",
		"reports_dashboard",
		"admin_tools",
		"fraud_monitoring",
		"bulk_operations",
		"export_functions",
	],
	"senior_representative": [
		"account_management",
		"transaction_history",
		"customer_profiles",
		"reports_dashboard",
		"fraud_monitoring",
		"export_functions",
	],
	"representative": [
		"account_management",
		"transaction_history",
		"customer_profiles",
	],
	"analyst": [
		"reports_dashboard",
		"transaction_history",
	],
}

# Check if user can access a specific feature
feature_enabled(feature_name) if {
	user_claims := authentication.authenticated_claims
	feature_name in ui_features[user_claims.role]
}

# Allow accessing specific dashboard sections
allow_section_access if {
	user_claims := authentication.authenticated_claims
	section := input.request.query.section
	section in ui_features[user_claims.role]
}
