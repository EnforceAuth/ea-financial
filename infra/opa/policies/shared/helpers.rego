package shared.helpers

import rego.v1

# Helper functions for common validation and extraction

# Email validation (basic)
valid_email(email) if {
	contains(email, "@")
	contains(email, ".")
}

# Phone number validation (basic US format)
valid_phone(phone) if {
	count(phone) == 10

	# All characters are digits
	every char in phone {
		char in "0123456789"
	}
}

# Amount validation
valid_amount(amount) if {
	amount > 0
	is_number(amount)
}

# Currency code validation
valid_currency(currency) if {
	currency in ["USD", "EUR", "GBP", "CAD", "JPY"]
}

# Account number format validation
valid_account_number(account) if {
	count(account) == 16

	# All characters are digits
	every char in account {
		char in "0123456789"
	}
}

# Parse query parameters
query_param(param_name) := value if {
	query_string := input.request.http.query
	params := split(query_string, "&")
	some param in params
	parts := split(param, "=")
	parts[0] == param_name
	value := parts[1]
}

# Check if request body contains field
has_field(field_name) if {
	object.get(input.request.body, field_name, null) != null
}

# Safe integer parsing
parse_int_safe(str) := result if {
	result := to_number(str)
}

parse_int_safe(str) := 0 if {
	not to_number(str)
}

# Check if array contains value
array_contains(arr, value) if {
	some item in arr
	item == value
}

# Get nested object value safely
get_nested(obj, path) := value if {
	path_parts := split(path, ".")
	value := walk_path(obj, path_parts)
}

walk_path(obj, []) := obj

walk_path(obj, [head | tail]) := walk_path(obj[head], tail) if {
	obj[head]
}

walk_path(obj, [head | tail]) := null if {
	not obj[head]
}
