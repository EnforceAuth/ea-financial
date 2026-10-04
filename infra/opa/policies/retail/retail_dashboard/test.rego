# METADATA
# title: Test
# description: This is a test on 10/4/26
package test

import rego.v1

default allow := false

# METADATA
# entrypoint: true
allow if {
	count(allow_rules) > 0
	count(deny_rules) == 0
}

# Allow Rule
allow_rules contains "1" if {
	input.resource == "asdf"
}

deny_rules := set()
