package retail.istio.authorization

import rego.v1

# Service-level authorization policies for Istio service mesh

# Allow health checks from anywhere
allow_health_check if {
	input.request.http.path in ["/health", "/healthz", "/ready"]
	input.request.http.method == "GET"
}

# Allow metrics scraping from Prometheus
allow_metrics_scraping if {
	input.request.http.path == "/metrics"
	input.request.http.method == "GET"
	input.source.namespace == "monitoring"
}

# Allow dashboard to call retail API
allow_dashboard_to_api if {
	input.source.service == "retail-dashboard"
	input.destination.service == "retail-api"
	input.source.namespace == "retail-banking"
}

# Allow API to access database
allow_api_to_database if {
	input.source.service == "retail-api"
	input.destination.service == "postgres"
	input.source.namespace == "retail-banking"
}

# Deny direct database access from dashboard
deny_dashboard_to_database if {
	input.source.service == "retail-dashboard"
	input.destination.service == "postgres"
}

# Allow access to shared services
allow_shared_services if {
	input.source.namespace == "retail-banking"
	input.destination.namespace == "shared-services"
	input.destination.service in ["redis", "kafka", "elasticsearch"]
}
