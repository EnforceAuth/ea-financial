package retail.retail_api.transactions

import rego.v1

import data.retail.retail_api.accounts
import data.retail.retail_api.authentication

# Transaction limits for retail accounts
retail_daily_limits := {
	"atm_withdrawal": 500,
	"debit_card": 2500,
	"wire_transfer": 10000,
	"mobile_deposit": 5000,
}

# Allow reading transactions
allow_read_transactions if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	contains(input.request.http.path, "/transactions")
	account_id := accounts.extract_account_id(input.request.http.path)
	accounts.account_access_allowed(user_claims, account_id)
	"transactions:read" in user_claims.permissions
}

# Allow debit transactions (withdrawals, purchases)
allow_debit if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/debit")
	account_id := accounts.extract_account_id(input.request.http.path)
	accounts.account_access_allowed(user_claims, account_id)
	"debit:create" in user_claims.permissions

	# Check transaction amount is within limits
	amount := input.request.body.amount
	transaction_type := input.request.body.transaction_type
	amount <= retail_daily_limits[transaction_type]
}

# Allow credit transactions (deposits)
allow_credit if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/credit")
	account_id := accounts.extract_account_id(input.request.http.path)
	accounts.account_access_allowed(user_claims, account_id)
	"credit:create" in user_claims.permissions
}

# Allow internal transfers between retail accounts
allow_internal_transfer if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/transfers/internal"

	# User must have access to both source and destination accounts
	from_account := input.request.body.from_account_id
	to_account := input.request.body.to_account_id
	accounts.account_access_allowed(user_claims, from_account)
	accounts.account_access_allowed(user_claims, to_account)

	"transactions:create" in user_claims.permissions
}

# Employee overrides for small amounts (under $1,000)
allow_manual_adjustment if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/transactions/adjust")
	user_claims.role in ["manager", "senior_representative"]
	"admin:update" in user_claims.permissions

	# Amount must be under manual override limit
	amount := input.request.body.amount
	amount <= 1000
}

# Large adjustments require dual approval (manager only)
allow_large_adjustment if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/transactions/adjust")
	user_claims.role == "manager"
	"admin:update" in user_claims.permissions

	# Amount over $5,000 requires dual approval
	amount := input.request.body.amount
	amount >= 5000
	input.request.body.dual_approval_id != null
}

# Transaction reversal (manager only)
allow_transaction_reversal if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/transactions/reverse")
	user_claims.role == "manager"
	"admin:update" in user_claims.permissions
}
