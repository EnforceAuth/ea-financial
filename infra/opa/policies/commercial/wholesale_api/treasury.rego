package commercial.wholesale_api.treasury

import rego.v1

import data.commercial.wholesale_api.authentication

# Treasury services - cash management, FX, securities

# Wire transfer limits for commercial clients
wire_limits := {
	"standard": 1000000, # $1M
	"premium": 10000000, # $10M
	"enterprise": 100000000, # $100M
}

# Allow wire transfers based on client tier
allow_wire_transfer if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/treasury/wire-transfer"
	"treasury:wire" in user_claims.permissions

	amount := input.request.body.amount
	amount > 0 # Validate positive amount

	# Validate client exists and has tier
	user_claims.client_id != null
	client := data.clients[user_claims.client_id]
	client != null
	client.tier != null

	# Validate tier exists in limits
	client_tier := client.tier
	client_tier in wire_limits
	amount <= wire_limits[client_tier]
}

# Foreign exchange transactions
allow_fx_trade if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/treasury/fx"
	"treasury:fx" in user_claims.permissions

	# FX trades over $10M need treasury approval
	amount := input.request.body.amount
	amount <= 10000000
}

allow_fx_trade_large if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/treasury/fx"
	"treasury:fx_approve" in user_claims.permissions
	user_claims.role in ["vp", "svp"]
}

# Cash concentration and pooling
allow_cash_pooling if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/treasury/cash-pooling"
	"treasury:pooling" in user_claims.permissions

	# Verify all accounts belong to same client
	accounts := input.request.body.account_ids
	client_accounts := data.client_accounts[user_claims.client_id]
	every account in accounts {
		account in client_accounts
	}
}

# Liquidity management reports
allow_liquidity_reports if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "GET"
	startswith(input.request.http.path, "/treasury/reports/liquidity")
	"treasury:reports" in user_claims.permissions
}

# Securities lending
allow_securities_lending if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	input.request.http.path == "/treasury/securities/lend"
	"treasury:securities" in user_claims.permissions
	user_claims.role in ["senior_manager", "vp", "svp"]
}

# Interest rate derivatives (swaps, options)
allow_derivatives if {
	user_claims := authentication.authenticated_claims
	input.request.http.method == "POST"
	startswith(input.request.http.path, "/treasury/derivatives")
	"treasury:derivatives" in user_claims.permissions
	user_claims.role in ["vp", "svp"]

	# Notional amount limits
	notional := input.request.body.notional_amount
	notional <= 50000000
}
