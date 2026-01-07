package retail.retail_api.transactions_test

import rego.v1

import data.retail.retail_api.transactions

# Mock user data for testing (internal employees and external customers)
mock_users := {
	"manager1": {
		"token": "token-manager",
		"role": "manager",
		"permissions": ["accounts:read", "transactions:read", "transactions:create", "debit:create", "credit:create", "admin:update"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"senior_rep": {
		"token": "token-senior",
		"role": "senior_representative",
		"permissions": ["accounts:read", "transactions:read", "transactions:create", "debit:create", "credit:create", "admin:update"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"rep1": {
		"token": "token-rep",
		"role": "representative",
		"permissions": ["accounts:read", "transactions:read", "debit:create", "credit:create"],
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

# Mock user-account assignments (employees and customers)
mock_user_accounts := {
	"rep1": ["ACC001", "ACC002"],
	"senior_rep": ["ACC001", "ACC003"],
	"alice.consumer": ["ACC-R001", "ACC-R002"],
	"bob.premium": ["ACC-R003", "ACC-R004", "ACC-R005"],
	"dan.inactive": ["ACC-R007"],
}

# Test: retail_daily_limits configuration
test_retail_daily_limits_atm if {
	transactions.retail_daily_limits.atm_withdrawal == 500
}

test_retail_daily_limits_debit_card if {
	transactions.retail_daily_limits.debit_card == 2500
}

test_retail_daily_limits_wire if {
	transactions.retail_daily_limits.wire_transfer == 10000
}

test_retail_daily_limits_mobile_deposit if {
	transactions.retail_daily_limits.mobile_deposit == 5000
}

# Test: allow_read_transactions for user with assigned account
test_allow_read_transactions_assigned if {
	transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC001/transactions",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_read_transactions for manager (any account)
test_allow_read_transactions_manager if {
	transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC999/transactions",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_read_transactions denied for unassigned account
test_allow_read_transactions_denied_unassigned if {
	not transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC999/transactions",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_debit within limits
test_allow_debit_within_limits if {
	transactions.allow_debit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC001/debit",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {
				"amount": 400,
				"transaction_type": "atm_withdrawal",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_debit denied over limit
test_allow_debit_over_limit if {
	not transactions.allow_debit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC001/debit",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {
				"amount": 600,
				"transaction_type": "atm_withdrawal",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_debit denied for unassigned account
test_allow_debit_denied_unassigned if {
	not transactions.allow_debit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC999/debit",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {
				"amount": 100,
				"transaction_type": "atm_withdrawal",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_credit for assigned account
test_allow_credit_assigned if {
	transactions.allow_credit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC001/credit",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_credit denied for unassigned account
test_allow_credit_denied_unassigned if {
	not transactions.allow_credit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC999/credit",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_internal_transfer between assigned accounts (senior rep has transactions:create)
test_allow_internal_transfer_both_assigned if {
	transactions.allow_internal_transfer with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transfers/internal",
				"headers": {"authorization": "Bearer token-senior"},
			},
			"body": {
				"from_account_id": "ACC001",
				"to_account_id": "ACC003",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_internal_transfer denied when source not assigned
test_allow_internal_transfer_denied_source_unassigned if {
	not transactions.allow_internal_transfer with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transfers/internal",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {
				"from_account_id": "ACC999",
				"to_account_id": "ACC001",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_internal_transfer denied when destination not assigned
test_allow_internal_transfer_denied_dest_unassigned if {
	not transactions.allow_internal_transfer with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transfers/internal",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {
				"from_account_id": "ACC001",
				"to_account_id": "ACC999",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: allow_internal_transfer for manager (any accounts)
test_allow_internal_transfer_manager if {
	transactions.allow_internal_transfer with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transfers/internal",
				"headers": {"authorization": "Bearer token-manager"},
			},
			"body": {
				"from_account_id": "ACC888",
				"to_account_id": "ACC999",
			},
		}
	} with data.users as mock_users
}

# Test: allow_manual_adjustment for senior rep under $1000
test_allow_manual_adjustment_senior_rep if {
	transactions.allow_manual_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-senior"},
			},
			"body": {"amount": 500},
		}
	} with data.users as mock_users
}

# Test: allow_manual_adjustment denied over $1000
test_allow_manual_adjustment_denied_over_limit if {
	not transactions.allow_manual_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-senior"},
			},
			"body": {"amount": 1500},
		}
	} with data.users as mock_users
}

# Test: allow_manual_adjustment denied for regular rep
test_allow_manual_adjustment_denied_rep if {
	not transactions.allow_manual_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-rep"},
			},
			"body": {"amount": 100},
		}
	} with data.users as mock_users
}

# Test: allow_large_adjustment for manager with dual approval
test_allow_large_adjustment_with_dual_approval if {
	transactions.allow_large_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-manager"},
			},
			"body": {
				"amount": 10000,
				"dual_approval_id": "APPROVAL-123",
			},
		}
	} with data.users as mock_users
}

# Test: allow_large_adjustment denied without dual approval
test_allow_large_adjustment_denied_no_approval if {
	not transactions.allow_large_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-manager"},
			},
			"body": {
				"amount": 10000,
				"dual_approval_id": null,
			},
		}
	} with data.users as mock_users
}

# Test: allow_large_adjustment denied for senior rep
test_allow_large_adjustment_denied_senior_rep if {
	not transactions.allow_large_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-senior"},
			},
			"body": {
				"amount": 10000,
				"dual_approval_id": "APPROVAL-123",
			},
		}
	} with data.users as mock_users
}

# Test: allow_transaction_reversal for manager only
test_allow_transaction_reversal_manager if {
	transactions.allow_transaction_reversal with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/reverse/TXN123",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_transaction_reversal denied for senior rep
test_allow_transaction_reversal_denied_senior_rep if {
	not transactions.allow_transaction_reversal with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/reverse/TXN123",
				"headers": {"authorization": "Bearer token-senior"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_transaction_reversal denied for regular rep
test_allow_transaction_reversal_denied_rep if {
	not transactions.allow_transaction_reversal with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/reverse/TXN123",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users
}

# =============================================================================
# RETAIL CUSTOMER TRANSACTION TESTS
# =============================================================================

# Test: customer can read their own transactions
test_customer_read_own_transactions if {
	transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R001/transactions",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer cannot read another customer's transactions
test_customer_denied_read_other_transactions if {
	not transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R003/transactions",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer can make debit within limits
test_customer_debit_within_limits if {
	transactions.allow_debit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC-R001/debit",
				"headers": {"authorization": "Bearer token-alice"},
			},
			"body": {
				"amount": 400,
				"transaction_type": "atm_withdrawal",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer denied debit over limits
test_customer_debit_over_limits if {
	not transactions.allow_debit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC-R001/debit",
				"headers": {"authorization": "Bearer token-alice"},
			},
			"body": {
				"amount": 600,
				"transaction_type": "atm_withdrawal",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer can make credit (deposit) to own account
test_customer_credit_own_account if {
	transactions.allow_credit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC-R001/credit",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer cannot credit another customer's account
test_customer_denied_credit_other_account if {
	not transactions.allow_credit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC-R003/credit",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer can transfer between own accounts
test_customer_transfer_between_own_accounts if {
	transactions.allow_internal_transfer with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transfers/internal",
				"headers": {"authorization": "Bearer token-alice"},
			},
			"body": {
				"from_account_id": "ACC-R001",
				"to_account_id": "ACC-R002",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer cannot transfer to another customer's account
test_customer_denied_transfer_to_other if {
	not transactions.allow_internal_transfer with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transfers/internal",
				"headers": {"authorization": "Bearer token-alice"},
			},
			"body": {
				"from_account_id": "ACC-R001",
				"to_account_id": "ACC-R003",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: premium customer can read transactions
test_premium_customer_read_transactions if {
	transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R003/transactions",
				"headers": {"authorization": "Bearer token-bob"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: premium customer can make larger debit card purchases
test_premium_customer_debit_card if {
	transactions.allow_debit with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/accounts/ACC-R003/debit",
				"headers": {"authorization": "Bearer token-bob"},
			},
			"body": {
				"amount": 2000,
				"transaction_type": "debit_card",
			},
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: inactive customer denied transaction access
test_inactive_customer_denied_transactions if {
	not transactions.allow_read_transactions with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R007/transactions",
				"headers": {"authorization": "Bearer token-dan"},
			}
		}
	} with data.users as mock_users with data.user_accounts as mock_user_accounts
}

# Test: customer cannot do manual adjustments (internal only)
test_customer_denied_manual_adjustment if {
	not transactions.allow_manual_adjustment with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/adjust",
				"headers": {"authorization": "Bearer token-alice"},
			},
			"body": {"amount": 50},
		}
	} with data.users as mock_users
}

# Test: customer cannot reverse transactions (internal only)
test_customer_denied_reversal if {
	not transactions.allow_transaction_reversal with input as {
		"request": {
			"http": {
				"method": "POST",
				"path": "/transactions/reverse/TXN123",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}
