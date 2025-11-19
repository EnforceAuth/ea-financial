package retail.istio.traffic_management

import rego.v1

# Service mesh traffic policies for retail banking services

# Allow internal service-to-service communication
allow_internal_traffic if {
	input.source.namespace == "retail-banking"
	input.destination.namespace == "retail-banking"
}

# Allow traffic from API gateway to retail services
allow_gateway_traffic if {
	input.source.service == "istio-ingressgateway"
	input.destination.namespace == "retail-banking"
}

# Rate limiting rules per service
rate_limits := {
	"retail-api": {
		"requests_per_second": 1000,
		"burst": 2000,
	},
	"dashboard": {
		"requests_per_second": 500,
		"burst": 1000,
	},
}

# Circuit breaker settings for retail services
circuit_breaker := {
	"max_connections": 1000,
	"max_pending_requests": 1000,
	"max_requests": 1000,
	"consecutive_errors": 5,
}

# Retry policy for transient failures
retry_policy := {
	"attempts": 3,
	"timeout": "3s",
	"retry_on": "5xx,reset,connect-failure,refused-stream",
}

# Allow traffic based on mutual TLS
allow_mtls_traffic if {
	input.source.principal != ""
	input.destination.principal != ""
	startswith(input.source.principal, "cluster.local/ns/retail-banking")
}

# Deny traffic from unauthorized namespaces
deny_unauthorized_namespace if {
	not input.source.namespace in ["retail-banking", "istio-system", "monitoring"]
}
