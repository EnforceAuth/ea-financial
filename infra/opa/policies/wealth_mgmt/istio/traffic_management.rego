package wealth_mgmt.istio.traffic_management

import rego.v1

# Service mesh for wealth management - highest security tier

# Allow internal traffic within wealth management namespace
allow_internal_traffic if {
	input.source.namespace == "wealth-management"
	input.destination.namespace == "wealth-management"
}

# Strict mutual TLS - mandatory for all connections
require_strict_mtls if {
	input.destination.namespace == "wealth-management"
}

allow_mtls_traffic if {
	input.source.principal != ""
	input.destination.principal != ""
	startswith(input.source.principal, "cluster.local/ns/wealth-management")

	# Wealth management requires specific service accounts
	input.source.principal != "cluster.local/ns/wealth-management/sa/default"

	# Verify TLS version
	input.connection.tls_version == "TLSv1.3"
}

# Rate limiting - very conservative
rate_limits := {
	"investing-api": {
		"requests_per_second": 200,
		"burst": 400,
	},
	"portfolio-mgmt-app": {
		"requests_per_second": 100,
		"burst": 200,
	},
	"dashboard": {
		"requests_per_second": 100,
		"burst": 200,
	},
}

# Circuit breaker - fail very fast
circuit_breaker := {
	"max_connections": 200,
	"max_pending_requests": 200,
	"max_requests": 200,
	"consecutive_errors": 2,
}

# Retry policy - minimal retries
retry_policy := {
	"attempts": 1, # No automatic retries for financial transactions
	"timeout": "1s",
	"retry_on": "reset", # Only retry on connection reset
}

# Network isolation - wealth management is highly restricted
deny_external_namespace if {
	input.destination.namespace == "wealth-management"
	not input.source.namespace in ["wealth-management", "istio-system", "monitoring"]
}

# Require encryption in transit
require_encryption if {
	input.destination.namespace == "wealth-management"
	# All connections must be encrypted
}

# Geo-restriction for sensitive operations
allow_geo_restricted if {
	input.source.namespace == "wealth-management"

	# Would integrate with geo-IP service
	input.source.geo_country in ["US", "CA"]
}
