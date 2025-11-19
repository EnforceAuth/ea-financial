package commercial.kubernetes.rbac

import rego.v1

# Kubernetes RBAC for commercial banking - stricter controls

# Service account permissions (principle of least privilege)
service_account_permissions := {
	"wholesale-api-sa": ["get", "list", "watch"],
	"commercial-dashboard-sa": ["get", "list"],
	"treasury-service-sa": ["get", "list", "watch", "create", "update"],
	"commercial-admin-sa": ["*"],
}

# Allow service account operations
allow_service_account if {
	sa := input.spec.serviceAccountName
	verb := input.spec.verb
	resource := input.spec.resource

	sa in service_account_permissions
	verb in service_account_permissions[sa]

	# Commercial services can only access specific resources
	resource in ["configmaps", "secrets", "services", "pods"]
}

# Developer access - no direct access to production
deny_developer_production if {
	input.user.groups[_] == "commercial-developers"
	input.spec.namespace == "commercial-banking-prod"
}

# Developers can access staging
allow_developer_staging if {
	input.user.groups[_] == "commercial-developers"
	input.spec.namespace == "commercial-banking-staging"
	input.spec.verb in ["get", "list", "watch"]
}

# SRE access with audit logging
allow_sre_access if {
	input.user.groups[_] == "sre-team"
	input.spec.namespace in ["commercial-banking", "commercial-banking-prod"]
	# All SRE actions are logged
}

# Require approval for destructive operations
deny_destructive_without_approval if {
	input.spec.verb in ["delete", "deletecollection"]
	not input.metadata.annotations["approval-id"]
}

# No privileged containers in commercial
deny_privileged_container if {
	input.spec.containers[_].securityContext.privileged == true
}

# Mandatory resource limits (stricter than retail)
deny_missing_limits if {
	some container in input.spec.containers
	not container.resources.limits.cpu
	not container.resources.limits.memory
}

deny_missing_requests if {
	some container in input.spec.containers
	not container.resources.requests.cpu
	not container.resources.requests.memory
}
