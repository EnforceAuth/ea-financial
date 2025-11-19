package commercial.istio.traffic_management

import rego.v1

# Service mesh policies for commercial banking - higher security requirements

# Allow internal service-to-service communication within commercial namespace
allow_internal_traffic if {
	input.source.namespace == "commercial-banking"
	input.destination.namespace == "commercial-banking"
}

# Strict mutual TLS for all commercial traffic
require_mtls if {
	input.destination.namespace == "commercial-banking"
}

allow_mtls_traffic if {
	input.source.principal != ""
	input.destination.principal != ""
	startswith(input.source.principal, "cluster.local/ns/commercial-banking")

	# Commercial requires specific service accounts
	input.source.principal != "cluster.local/ns/commercial-banking/sa/default"
}

# Rate limiting - more conservative for commercial
rate_limits := {
	"wholesale-api": {
		"requests_per_second": 500,
		"burst": 1000,
	},
	"dashboard": {
		"requests_per_second": 200,
		"burst": 500,
	},
}

# Circuit breaker with tighter thresholds
circuit_breaker := {
	"max_connections": 500,
	"max_pending_requests": 500,
	"max_requests": 500,
	"consecutive_errors": 3, # Fail faster
}

# Retry policy
retry_policy := {
	"attempts": 2, # Fewer retries for commercial
	"timeout": "2s",
	"retry_on": "5xx,reset,connect-failure",
}

# Deny traffic from non-commercial namespaces except monitoring
deny_cross_namespace if {
	input.destination.namespace == "commercial-banking"
	not input.source.namespace in ["commercial-banking", "istio-system", "monitoring", "shared-services"]
}

# Require encryption for all commercial traffic
require_tls_version if {
	input.destination.namespace == "commercial-banking"
	# Minimum TLS 1.3 for commercial
}
