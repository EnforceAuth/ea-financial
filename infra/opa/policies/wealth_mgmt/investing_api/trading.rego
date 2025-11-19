package wealth_mgmt.investing_api.trading

import rego.v1

import data.wealth_mgmt.investing_api.authentication

# Trading and execution policies

# Trade limits per transaction
trade_limits := {
	"advisor": 500000, # $500K
	"senior_advisor": 2000000, # $2M
	"portfolio_manager": 10000000, # $10M
	"managing_director": 50000000, # $50M
}

# Allow equity trades
allow_equity_trade if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/trades/equity"

	"trading:execute" in user_claims.permissions
	authentication.has_license("series_7") # General securities license

	trade_amount := input.request.body.amount
	user_limit := trade_limits[user_claims.role]
	trade_amount <= user_limit
}

# Allow fixed income trades
allow_fixed_income_trade if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/trades/fixed-income"

	"trading:execute" in user_claims.permissions
	authentication.has_license("series_7")
}

# Allow options trading (requires series 4)
allow_options_trade if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/trades/options"

	"trading:options" in user_claims.permissions
	authentication.has_license("series_4")

	# Options require risk disclosure
	input.request.body.risk_disclosure_signed == true
}

# Allow mutual fund transactions
allow_mutual_fund if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	contains(input.request.http.path, "/trades/mutual-funds")

	"trading:execute" in user_claims.permissions
	authentication.has_license("series_6") # Mutual funds license
}

# Alternative investments (private equity, hedge funds)
allow_alternative_investment if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/trades/alternatives"

	"trading:alternatives" in user_claims.permissions
	user_claims.role in ["portfolio_manager", "managing_director"]

	# Verify accredited investor status
	client_id := input.request.body.client_id
	data.clients[client_id].accredited_investor == true
}

# Trade pre-approval for large orders
trade_approval_required if {
	trade_amount := input.request.body.amount
	trade_amount >= 5000000 # $5M requires pre-approval
}

# Cancel or modify orders
allow_order_management if {
	user_claims := authentication.authenticated_claims
	input.request.http.method in ["PUT", "DELETE"]
	startswith(input.request.http.path, "/orders/")

	"trading:manage" in user_claims.permissions
}

# Market data access
allow_market_data if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/market-data")

	"trading:market_data" in user_claims.permissions
}
