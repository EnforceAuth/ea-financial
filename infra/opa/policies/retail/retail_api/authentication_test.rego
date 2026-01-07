package retail.retail_api.authentication_test

import rego.v1

import data.retail.retail_api.authentication

# Mock user data for testing (internal employees and external customers)
mock_users := {
	"jsmith": {
		"token": "valid-token-jsmith",
		"role": "senior_representative",
		"permissions": ["accounts:read", "transactions:read"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"inactive_user": {
		"token": "valid-token-inactive",
		"role": "representative",
		"permissions": ["accounts:read"],
		"department": "retail",
		"active": false,
		"exp": 9999999999,
	},
	"alice.consumer": {
		"token": "token-alice",
		"role": "retail_customer",
		"permissions": ["accounts:read", "balance:read", "transactions:read", "transactions:create", "credit:create", "debit:create", "terms:read"],
		"department": "retail_banking",
		"active": true,
		"exp": 9999999999,
		"customer_tier": "standard",
	},
	"dan.inactive": {
		"token": "token-dan",
		"role": "retail_customer",
		"permissions": ["accounts:read", "balance:read", "transactions:read", "terms:read"],
		"department": "retail_banking",
		"active": false,
		"exp": 9999999999,
		"customer_tier": "standard",
	},
}

# Test: extract_token extracts bearer token correctly
test_extract_token_valid if {
	token := authentication.extract_token with input as {
		"request": {"http": {"headers": {"authorization": "Bearer my-test-token"}}}
	}
	token == "my-test-token"
}

# Test: extract_token fails without Bearer prefix
test_extract_token_no_bearer if {
	not authentication.extract_token with input as {
		"request": {"http": {"headers": {"authorization": "Basic credentials"}}}
	}
}

# Test: extract_token fails with missing header
test_extract_token_missing_header if {
	not authentication.extract_token with input as {
		"request": {"http": {"headers": {}}}
	}
}

# Test: valid_token accepts non-empty token
test_valid_token_non_empty if {
	authentication.valid_token("some-token")
}

# Test: valid_token rejects empty token
test_valid_token_empty if {
	not authentication.valid_token("")
}

# Test: claims extracts user claims from token
test_claims_valid_user if {
	user_claims := authentication.claims("valid-token-jsmith") with data.users as mock_users
	user_claims.sub == "jsmith"
	user_claims.role == "senior_representative"
	"accounts:read" in user_claims.permissions
}

# Test: user_active returns true for active user
test_user_active_true if {
	authentication.user_active({"active": true})
}

# Test: user_active returns false for inactive user
test_user_active_false if {
	not authentication.user_active({"active": false})
}

# Test: authenticated_claims returns claims for valid active user
test_authenticated_claims_valid if {
	claims := authentication.authenticated_claims with input as {
		"request": {"http": {"headers": {"authorization": "Bearer valid-token-jsmith"}}}
	} with data.users as mock_users
	claims.sub == "jsmith"
	claims.active == true
}

# Test: authenticated_claims fails for inactive user
test_authenticated_claims_inactive_user if {
	not authentication.authenticated_claims with input as {
		"request": {"http": {"headers": {"authorization": "Bearer valid-token-inactive"}}}
	} with data.users as mock_users
}

# Test: allow_login permits POST to /auth/login
test_allow_login_post if {
	authentication.allow_login with input as {
		"request": {"http": {"method": "POST", "path": "/auth/login"}}
	}
}

# Test: allow_login denies GET to /auth/login
test_allow_login_wrong_method if {
	not authentication.allow_login with input as {
		"request": {"http": {"method": "GET", "path": "/auth/login"}}
	}
}

# Test: allow_login denies POST to wrong path
test_allow_login_wrong_path if {
	not authentication.allow_login with input as {
		"request": {"http": {"method": "POST", "path": "/auth/register"}}
	}
}

# Test: allow_logout permits authenticated user
test_allow_logout_authenticated if {
	authentication.allow_logout with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/auth/logout",
				"headers": {"authorization": "Bearer valid-token-jsmith"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_logout denies unauthenticated user
test_allow_logout_unauthenticated if {
	not authentication.allow_logout with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/auth/logout",
				"headers": {},
			}
		}
	} with data.users as mock_users
}

# Test: allow_verify permits authenticated user
test_allow_verify_authenticated if {
	authentication.allow_verify with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/auth/verify",
				"headers": {"authorization": "Bearer valid-token-jsmith"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_verify denies unauthenticated user
test_allow_verify_unauthenticated if {
	not authentication.allow_verify with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/auth/verify",
				"headers": {},
			}
		}
	} with data.users as mock_users
}

# =============================================================================
# RETAIL CUSTOMER AUTHENTICATION TESTS
# =============================================================================

# Test: customer can authenticate with valid token
test_customer_authenticated_claims if {
	claims := authentication.authenticated_claims with input as {
		"request": {"http": {"headers": {"authorization": "Bearer token-alice"}}}
	} with data.users as mock_users
	claims.sub == "alice.consumer"
	claims.role == "retail_customer"
	claims.active == true
}

# Test: customer can logout
test_customer_logout if {
	authentication.allow_logout with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/auth/logout",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: customer can verify token
test_customer_verify if {
	authentication.allow_verify with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/auth/verify",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: inactive customer cannot authenticate
test_inactive_customer_denied if {
	not authentication.authenticated_claims with input as {
		"request": {"http": {"headers": {"authorization": "Bearer token-dan"}}}
	} with data.users as mock_users
}
