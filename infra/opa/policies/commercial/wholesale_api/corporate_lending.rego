package commercial.wholesale_api.corporate_lending

import rego.v1

import data.commercial.wholesale_api.authentication

# Corporate lending limits and approvals
lending_limits := {
	"relationship_manager": 1000000, # $1M
	"senior_manager": 10000000, # $10M
	"vp": 50000000, # $50M
	"svp": 100000000, # $100M
}

# Credit line management
allow_view_credit_lines if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/credit-lines")
	"credit:read" in user_claims.permissions
}

# Request new credit line
allow_request_credit_line if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/credit-lines"
	user_claims.role in ["relationship_manager", "senior_manager", "vp", "svp"]
	"credit:create" in user_claims.permissions
}

# Approve credit line (requires authorization level)
allow_approve_credit_line if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/credit-lines/")
	contains(input.request.http.path, "/approve")

	requested_amount := input.request.body.amount
	user_limit := lending_limits[user_claims.role]
	requested_amount <= user_limit

	"credit:approve" in user_claims.permissions
}

# Multi-level approval for large loans
require_multi_level_approval if {
	requested_amount := input.request.body.amount
	requested_amount > 50000000 # Over $50M needs multiple approvals
}

# Commercial loan disbursement
allow_loan_disbursement if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/loans/disburse")
	user_claims.role in ["senior_manager", "vp", "svp"]
	"loans:disburse" in user_claims.permissions

	# Must be approved loan
	input.request.body.loan_status == "approved"
}

# View loan portfolio
allow_view_loans if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/loans")
	"loans:read" in user_claims.permissions
}
