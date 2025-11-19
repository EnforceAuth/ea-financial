package retail.kubernetes.pod_security

import rego.v1

# Pod Security Standards for retail banking workloads

# Enforce restricted pod security standard
restricted_pss := {
	"allowPrivilegeEscalation": false,
	"capabilities": {"drop": ["ALL"]},
	"runAsNonRoot": true,
	"seccompProfile": {"type": "RuntimeDefault"},
}

# Allow pods that meet security standards
allow_secure_pod if {
	some container in input.spec.containers
	container.securityContext.allowPrivilegeEscalation == false
	container.securityContext.runAsNonRoot == true
}

# Deny host namespace sharing
deny_host_namespace if {
	input.spec.hostNetwork == true
}

deny_host_namespace if {
	input.spec.hostPID == true
}

deny_host_namespace if {
	input.spec.hostIPC == true
}

# Deny host path volumes except for specific use cases
deny_host_path if {
	some volume in input.spec.volumes
	volume.hostPath
	not volume.name in ["docker-sock", "logs"]
}

# Require read-only root filesystem
deny_writable_root if {
	some container in input.spec.containers
	not container.securityContext.readOnlyRootFilesystem == true
}

# Image pull policy must be Always or IfNotPresent
deny_pull_policy if {
	some container in input.spec.containers
	not container.imagePullPolicy in ["Always", "IfNotPresent"]
}

# Require specific image registry
deny_untrusted_registry if {
	some container in input.spec.containers
	not startswith(container.image, "ea-financial.registry.io/")
	not startswith(container.image, "docker.io/library/") # Allow official images
}

# Network policies - deny all by default, allow specific
network_policy_required if {
	input.kind == "Pod"
	input.metadata.namespace == "retail-banking"
}
