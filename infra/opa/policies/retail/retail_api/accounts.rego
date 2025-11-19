package retail.retail_api.accounts

import rego.v1

import data.retail.retail_api.authentication

# Account access control - users can only access accounts they're assigned to
account_access_allowed(user_claims, account_id) if {
	# Managers can access any account
	user_claims.role == "manager"
}

account_access_allowed(user_claims, account_id) if {
	# Users can access accounts in their assigned list
	account_id in data.user_accounts[user_claims.sub]
}

# Extract account ID from path
extract_account_id(path) := account_id if {
	path_parts := split(trim(path, "/"), "/")
	count(path_parts) >= 2
	path_parts[0] == "accounts"
	account_id := path_parts[1]
}

# Allow reading account details
allow_read_account if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/accounts/")
	account_id := extract_account_id(input.request.http.path)
	account_access_allowed(user_claims, account_id)
	"accounts:read" in user_claims.permissions
}

# Allow reading account balance
allow_read_balance if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	contains(input.request.http.path, "/balance")
	account_id := extract_account_id(input.request.http.path)
	account_access_allowed(user_claims, account_id)
	"balance:read" in user_claims.permissions
}

# Allow listing accounts (only for managers and senior reps)
allow_list_accounts if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	input.request.http.path == "/accounts"
	user_claims.role in ["manager", "senior_representative"]
	"accounts:read" in user_claims.permissions
}

# Account opening (retail - checking and savings only)
allow_open_account if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/accounts"
	user_claims.role in ["manager", "senior_representative"]
	"accounts:create" in user_claims.permissions

	# Retail can only open checking and savings accounts
	input.request.body.account_type in ["checking", "savings"]
}

# Account closure requires manager approval
allow_close_account if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "DELETE"
	startswith(input.request.http.path, "/accounts/")
	user_claims.role == "manager"
	"accounts:delete" in user_claims.permissions
}

# Account status updates (freeze/unfreeze)
allow_update_account_status if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "PATCH"
	startswith(input.request.http.path, "/accounts/")
	contains(input.request.http.path, "/status")
	user_claims.role in ["manager", "senior_representative"]
	"accounts:update" in user_claims.permissions
}
