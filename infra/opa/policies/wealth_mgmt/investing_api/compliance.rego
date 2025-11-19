package wealth_mgmt.investing_api.compliance

import rego.v1

import data.wealth_mgmt.investing_api.authentication

# Wealth management compliance - SEC, FINRA, fiduciary duty

# Suitability assessment required for all trades
suitability_check_required if {
	input.request.http.method == "POST"
	startswith(input.request.http.path, "/trades/")
}

# Verify investment is suitable for client
investment_suitable if {
	client_id := input.request.body.client_id
	client_risk_profile := data.clients[client_id].risk_profile
	investment_risk := input.request.body.risk_level

	# Match investment risk with client profile
	client_risk_profile == investment_risk
}

# Best execution policy
best_execution_verified if {
	input.request.body.execution_venue != null
	input.request.body.execution_quality_checked == true
}

# Disclosure requirements
disclosure_required if {
	input.request.body.investment_type in [
		"options",
		"alternatives",
		"structured_products",
		"margin",
	]
}

disclosure_provided if {
	input.request.body.risk_disclosure_signed == true
	input.request.body.disclosure_date != null
}

# Investment advisor fiduciary duty
fiduciary_duty_met if {
	user_claims := authentication.authenticated_claims
	authentication.has_license("series_65")

	# Must act in client's best interest
	input.request.body.best_interest_documented == true
}

# Conflict of interest checks
conflict_of_interest_cleared if {
	user_claims := authentication.authenticated_claims
	client_id := input.request.body.client_id

	# Check for conflicts
	not advisor_has_conflict(user_claims.advisor_id, client_id)
}

advisor_has_conflict(advisor_id, client_id) if {
	# Placeholder - would check conflicts database
	false
}

# FINRA reporting requirements
allow_finra_report if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	startswith(input.request.http.path, "/compliance/finra")
	user_claims.role == "compliance_officer"
	"compliance:regulatory" in user_claims.permissions
}

# SEC Form ADV updates
allow_form_adv if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/compliance/sec/form-adv"
	user_claims.role in ["compliance_officer", "managing_director"]
	"compliance:sec" in user_claims.permissions
}

# Trade surveillance and monitoring
allow_trade_surveillance if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/compliance/surveillance")
	user_claims.role == "compliance_officer"
	"compliance:surveillance" in user_claims.permissions
}

# Market abuse detection
allow_market_abuse_review if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/compliance/market-abuse")
	user_claims.role in ["compliance_officer", "managing_director"]
}

# Audit trail logging
log_wealth_transaction := {
	"timestamp": time.now_ns(),
	"user": user_claims.sub,
	"role": user_claims.role,
	"advisor_id": user_claims.advisor_id,
	"client_id": input.request.body.client_id,
	"resource": input.request.http.path,
	"action": input.request.http.method,
	"organization": "wealth_mgmt",
	"system": "investing_api",
	"amount": input.request.body.amount,
	"licenses": user_claims.licenses,
} if {
	user_claims := authentication.authenticated_claims
	input.request.body.client_id
}
