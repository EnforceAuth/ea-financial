package wealth_mgmt.kubernetes.rbac

import rego.v1

# Kubernetes RBAC for wealth management - maximum security

# Service account permissions (most restrictive)
service_account_permissions := {
	"investing-api-sa": ["get", "list", "watch"],
	"portfolio-mgmt-app-sa": ["get", "list"],
	"wealth-dashboard-sa": ["get", "list"],
	"wealth-admin-sa": ["get", "list", "watch", "create", "update"],
}

# Service accounts can only access approved resources
allowed_resources := ["configmaps", "secrets", "services"]

# Allow service account operations (very restricted)
allow_service_account if {
	sa := input.spec.serviceAccountName
	verb := input.spec.verb
	resource := input.spec.resource

	sa in service_account_permissions
	verb in service_account_permissions[sa]
	resource in allowed_resources
}

# No developer access to wealth management production
deny_developer_access if {
	input.user.groups[_] == "wealth-developers"
	input.spec.namespace in ["wealth-management", "wealth-management-prod"]
}

# Developers restricted to isolated dev environment
allow_developer_dev if {
	input.user.groups[_] == "wealth-developers"
	input.spec.namespace == "wealth-management-dev"
	input.spec.verb in ["get", "list", "watch"]
}

# SRE access with mandatory change control
allow_sre_with_approval if {
	input.user.groups[_] == "sre-team"
	input.spec.namespace == "wealth-management"

	# Read operations allowed
	input.spec.verb in ["get", "list", "watch"]
}

allow_sre_with_approval if {
	input.user.groups[_] == "sre-team"
	input.spec.namespace == "wealth-management"

	# Write operations require approval
	input.spec.verb in ["create", "update", "patch"]
	input.metadata.annotations["change-control-id"]
}

# Deny all destructive operations without multi-level approval
deny_destructive if {
	input.spec.verb in ["delete", "deletecollection"]
	input.spec.namespace == "wealth-management"
	not input.metadata.annotations["multi-level-approval"]
}

# No privileged containers ever
deny_privileged if {
	input.spec.containers[_].securityContext.privileged == true
}

# No root user ever
deny_root if {
	some container in input.spec.containers
	container.securityContext.runAsUser == 0
}

# Mandatory security context
require_security_context if {
	some container in input.spec.containers
	container.securityContext.allowPrivilegeEscalation == false
	container.securityContext.runAsNonRoot == true
	container.securityContext.readOnlyRootFilesystem == true
	container.securityContext.capabilities.drop[_] == "ALL"
}

# Mandatory resource limits and requests
deny_missing_resources if {
	some container in input.spec.containers
	not container.resources.limits.cpu
	not container.resources.limits.memory
	not container.resources.requests.cpu
	not container.resources.requests.memory
}

# Image registry restriction (very strict)
deny_untrusted_image if {
	some container in input.spec.containers
	not startswith(container.image, "ea-financial.registry.io/wealth/")
}
