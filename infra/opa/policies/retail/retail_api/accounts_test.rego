package retail.retail_api.accounts_test

import rego.v1

import data.retail.retail_api.accounts

# Mock internal employee data for testing
mock_users := {
	"manager1": {
		"token": "token-manager",
		"role": "manager",
		"permissions": ["accounts:read", "accounts:create", "accounts:delete", "accounts:update", "balance:read"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"senior_rep": {
		"token": "token-senior",
		"role": "senior_representative",
		"permissions": ["accounts:read", "accounts:create", "accounts:update", "balance:read"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"rep1": {
		"token": "token-rep",
		"role": "representative",
		"permissions": ["accounts:read", "balance:read"],
		"department": "retail",
		"active": true,
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
	"bob.premium": {
		"token": "token-bob",
		"role": "retail_customer_premium",
		"permissions": ["accounts:read", "balance:read", "transactions:read", "transactions:create", "credit:create", "debit:create", "terms:read"],
		"department": "retail_banking",
		"active": true,
		"exp": 9999999999,
		"customer_tier": "premium",
	},
	"carol.joint": {
		"token": "token-carol",
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

# Mock user-account assignments (includes both employees and customers)
mock_user_accounts := {
	"rep1": ["ACC001", "ACC002"],
	"senior_rep": ["ACC001", "ACC003"],
	"alice.consumer": ["ACC-R001", "ACC-R002"],
	"bob.premium": ["ACC-R003", "ACC-R004", "ACC-R005"],
	"carol.joint": ["ACC-R006", "ACC-R001"],
	"dan.inactive": ["ACC-R007"],
}

# Test: account_access_allowed for manager (can access any account)
test_account_access_manager if {
	accounts.account_access_allowed({"role": "manager"}, "ANY-ACCOUNT-ID")
}

# Test: account_access_allowed for user with assigned account
test_account_access_assigned if {
	accounts.account_access_allowed(
		{"role": "representative", "sub": "rep1"},
		"ACC001",
	) with data.user_accounts as mock_user_accounts
}

# Test: account_access_allowed denied for unassigned account
test_account_access_denied_unassigned if {
	not accounts.account_access_allowed(
		{"role": "representative", "sub": "rep1"},
		"ACC999",
	) with data.user_accounts as mock_user_accounts
}

# Test: extract_account_id from path
test_extract_account_id if {
	account_id := accounts.extract_account_id("/accounts/ACC123")
	account_id == "ACC123"
}

# Test: extract_account_id from nested path
test_extract_account_id_nested if {
	account_id := accounts.extract_account_id("/accounts/ACC456/balance")
	account_id == "ACC456"
}

# Test: allow_read_account for manager
test_allow_read_account_manager if {
	accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC123",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_read_account for rep with assigned account
test_allow_read_account_assigned if {
	accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC001",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_read_account denied for rep with unassigned account
test_allow_read_account_denied_unassigned if {
	not accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC999",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_read_balance for user with permission
test_allow_read_balance if {
	accounts.allow_read_balance with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC001/balance",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_list_accounts for manager
test_allow_list_accounts_manager if {
	accounts.allow_list_accounts with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_list_accounts for senior representative
test_allow_list_accounts_senior_rep if {
	accounts.allow_list_accounts with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-senior"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_list_accounts denied for regular representative
test_allow_list_accounts_denied_rep if {
	not accounts.allow_list_accounts with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_open_account for manager with checking account
test_allow_open_account_checking if {
	accounts.allow_open_account with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-manager"},
			},
			"body": {"account_type": "checking"},
		}
	} with data.users as mock_users
}

# Test: allow_open_account for senior rep with savings account
test_allow_open_account_savings if {
	accounts.allow_open_account with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-senior"},
			},
			"body": {"account_type": "savings"},
		}
	} with data.users as mock_users
}

# Test: allow_open_account denied for investment account (retail only does checking/savings)
test_allow_open_account_denied_investment if {
	not accounts.allow_open_account with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-manager"},
			},
			"body": {"account_type": "investment"},
		}
	} with data.users as mock_users
}

# Test: allow_open_account denied for regular representative
test_allow_open_account_denied_rep if {
	not accounts.allow_open_account with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {"account_type": "checking"},
		}
	} with data.users as mock_users
}

# Test: allow_close_account for manager only
test_allow_close_account_manager if {
	accounts.allow_close_account with input as {
		"request": {
			"http": {
				"method": "DELETE",
				"path": "/accounts/ACC123",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_close_account denied for senior representative
test_allow_close_account_denied_senior_rep if {
	not accounts.allow_close_account with input as {
		"request": {
			"http": {
				"method": "DELETE",
				"path": "/accounts/ACC123",
				"headers": {"authorization": "Bearer token-senior"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_update_account_status for manager
test_allow_update_account_status_manager if {
	accounts.allow_update_account_status with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/accounts/ACC123/status",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_update_account_status for senior representative
test_allow_update_account_status_senior_rep if {
	accounts.allow_update_account_status with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/accounts/ACC123/status",
				"headers": {"authorization": "Bearer token-senior"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_update_account_status denied for regular representative
test_allow_update_account_status_denied_rep if {
	not accounts.allow_update_account_status with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/accounts/ACC123/status",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users
}

# =============================================================================
# RETAIL CUSTOMER TESTS
# =============================================================================

# Test: customer can access their own account
test_customer_access_own_account if {
	accounts.account_access_allowed(
		{"role": "retail_customer", "sub": "alice.consumer"},
		"ACC-R001",
	) with data.user_accounts as mock_user_accounts
}

# Test: customer cannot access another customer's account
test_customer_denied_other_account if {
	not accounts.account_access_allowed(
		{"role": "retail_customer", "sub": "alice.consumer"},
		"ACC-R003",
	) with data.user_accounts as mock_user_accounts
}

# Test: customer can read their own account details
test_customer_read_own_account if {
	accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R001",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer denied reading another customer's account
test_customer_denied_read_other_account if {
	not accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R003",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer can read their own balance
test_customer_read_own_balance if {
	accounts.allow_read_balance with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R001/balance",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: premium customer can access their accounts
test_premium_customer_access_account if {
	accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R003",
				"headers": {"authorization": "Bearer token-bob"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: joint account holder can access shared account
test_joint_account_access if {
	accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R001",
				"headers": {"authorization": "Bearer token-carol"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: joint account holder can also access their own account
test_joint_account_holder_own_account if {
	accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R006",
				"headers": {"authorization": "Bearer token-carol"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: inactive customer denied access
test_inactive_customer_denied if {
	not accounts.allow_read_account with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R007",
				"headers": {"authorization": "Bearer token-dan"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer cannot list all accounts (internal only)
test_customer_denied_list_accounts if {
	not accounts.allow_list_accounts with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: customer cannot open new accounts (internal only)
test_customer_denied_open_account if {
	not accounts.allow_open_account with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts",
				"headers": {"authorization": "Bearer token-alice"},
			},
			"body": {"account_type": "checking"},
		}
	} with data.users as mock_users
}

# Test: customer cannot close accounts (internal only)
test_customer_denied_close_account if {
	not accounts.allow_close_account with input as {
		"request": {
			"http": {
				"method": "DELETE",
				"path": "/accounts/ACC-R001",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: customer cannot update account status (internal only)
test_customer_denied_update_status if {
	not accounts.allow_update_account_status with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/accounts/ACC-R001/status",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}
