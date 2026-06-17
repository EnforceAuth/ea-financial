# METADATA
# title: EA Financial Global SSO
# description: Global unified access policy for all systems across the global entities of EA Financial
package ea_financial_global_sso

import rego.v1

default allow = false

# Allow Rule
allow if {
    input.subject.id contains "EAID"
}

