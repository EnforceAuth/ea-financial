package commercial.wholesale_api.compliance

import rego.v1

import data.commercial.wholesale_api.authentication

# Commercial banking compliance - KYC, AML, regulatory reporting

# KYC/AML verification requirements
kyc_verification_required if {
	transaction_amount := input.request.body.amount
	transaction_amount >= 10000 # BSA/AML threshold
}

# Enhanced due diligence for high-risk clients
edd_required if {
	user_claims := authentication.authenticated_claims
	client := data.clients[user_claims.client_id]
	client.risk_rating in ["high", "medium-high"]
}

# Allow viewing compliance reports
allow_compliance_reports if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/compliance/reports")
	user_claims.role in ["compliance_officer", "vp", "svp"]
	"compliance:read" in user_claims.permissions
}

# Suspicious Activity Report (SAR) filing
allow_sar_filing if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/compliance/sar"
	user_claims.role == "compliance_officer"
	"compliance:sar" in user_claims.permissions
}

# Currency Transaction Report (CTR) for transactions over $10K
ctr_required if {
	input.request.body.amount >= 10000
	input.request.body.currency == "USD"
}

allow_ctr_filing if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/compliance/ctr"
	"compliance:ctr" in user_claims.permissions
}

# OFAC screening
ofac_screening_required if {
	input.request.http.path in [
		"/treasury/wire-transfer",
		"/treasury/fx",
		"/credit-lines",
	]
}

allow_ofac_override if {
	user_claims := authentication.authenticated_claims
	user_claims.role == "compliance_officer"
	"compliance:ofac_override" in user_claims.permissions
}

# Regulatory reporting - Call Reports, FR Y-9C, etc.
allow_regulatory_filing if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	startswith(input.request.http.path, "/compliance/regulatory")
	user_claims.role in ["compliance_officer", "svp"]
	"compliance:regulatory" in user_claims.permissions
}

# Audit logging for commercial transactions
log_commercial_transaction := {
	"timestamp": time.now_ns(),
	"user": user_claims.sub,
	"role": user_claims.role,
	"client_id": user_claims.client_id,
	"resource": input.request.http.path,
	"action": input.request.http.method,
	"organization": "commercial",
	"system": "wholesale_api",
	"amount": input.request.body.amount,
} if {
	user_claims := authentication.authenticated_claims
	input.request.body.amount
}
