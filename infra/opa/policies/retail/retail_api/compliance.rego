package retail.retail_api.compliance

import rego.v1

import data.retail.retail_api.authentication

# Time-based access control for retail banking
banking_hours := {
	"start": 6,
	"end": 22,
}

time_based_access_allowed if {
	current_hour := 9 # Mock - in production use time.now_ns()
	current_hour >= banking_hours.start
	current_hour <= banking_hours.end
}

# Overdraft protection limits
overdraft_fee := 35

overdraft_daily_max := 6

# Regulation D - savings withdrawal limits
reg_d_monthly_limit := 6

# Allow reading terms and policies
allow_read_terms if {
	authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/terms")
}

# FDIC insurance configuration
fdic_insured := true

fdic_limit := 250000

# Fraud monitoring thresholds
fraud_monitoring := {
	"enabled": true,
	"transaction_threshold": 1000,
	"geographic_check": true,
	"velocity_check": true,
}

# Check for suspicious transaction patterns
suspicious_transaction if {
	amount := input.request.body.amount
	amount > fraud_monitoring.transaction_threshold
}

# Allow fraud alert review
allow_fraud_review if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/fraud/alerts")
	user_claims.role in ["manager", "senior_representative"]
}

# Allow fraud case updates (manager only)
allow_fraud_update if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "PATCH"
	startswith(input.request.http.path, "/fraud/cases")
	user_claims.role == "manager"
	"admin:update" in user_claims.permissions
}

# Compliance logging
log_decision := {
	"timestamp": time.now_ns(),
	"user": user_claims.sub,
	"role": user_claims.role,
	"resource": input.request.http.path,
	"action": input.request.http.method,
	"organization": "retail",
	"system": "retail_api",
} if {
	user_claims := authentication.authenticated_claims
}
