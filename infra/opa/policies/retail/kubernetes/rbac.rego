package retail.kubernetes.rbac

import rego.v1

# Kubernetes RBAC policies for retail banking namespace

# Service account permissions
service_account_permissions := {
	"retail-api-sa": ["get", "list", "watch"],
	"retail-dashboard-sa": ["get", "list"],
	"retail-admin-sa": ["*"],
}

# Allow service account to access resources
allow_service_account if {
	sa := input.spec.serviceAccountName
	verb := input.spec.verb
	sa in service_account_permissions
	verb in service_account_permissions[sa]
}

# Developer access - read-only in production
allow_developer_read if {
	input.user.groups[_] == "retail-developers"
	input.spec.verb in ["get", "list", "watch"]
	input.spec.namespace == "retail-banking"
}

# SRE access - full access to retail namespace
allow_sre_access if {
	input.user.groups[_] == "sre-team"
	input.spec.namespace == "retail-banking"
}

# Deny privileged containers except for specific services
deny_privileged_container if {
	input.spec.containers[_].securityContext.privileged == true
	not input.metadata.name in ["retail-api", "retail-dashboard"]
}

# Require resource limits
deny_missing_limits if {
	some container in input.spec.containers
	not container.resources.limits
}

# Deny root user
deny_root_user if {
	some container in input.spec.containers
	container.securityContext.runAsUser == 0
}
