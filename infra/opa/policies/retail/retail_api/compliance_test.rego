package retail.retail_api.compliance_test

import rego.v1

import data.retail.retail_api.compliance

# Mock user data for testing (internal employees and external customers)
mock_users := {
	"manager1": {
		"token": "token-manager",
		"role": "manager",
		"permissions": ["accounts:read", "admin:update"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"senior_rep": {
		"token": "token-senior",
		"role": "senior_representative",
		"permissions": ["accounts:read", "transactions:read"],
		"department": "retail",
		"active": true,
		"exp": 9999999999,
	},
	"rep1": {
		"token": "token-rep",
		"role": "representative",
		"permissions": ["accounts:read"],
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

# Test: banking_hours configuration
test_banking_hours_start if {
	compliance.banking_hours.start == 6
}

test_banking_hours_end if {
	compliance.banking_hours.end == 22
}

# Test: time_based_access_allowed (uses mock hour of 9)
test_time_based_access_allowed if {
	compliance.time_based_access_allowed
}

# Test: overdraft configuration
test_overdraft_fee if {
	compliance.overdraft_fee == 35
}

test_overdraft_daily_max if {
	compliance.overdraft_daily_max == 6
}

# Test: Regulation D savings withdrawal limit
test_reg_d_monthly_limit if {
	compliance.reg_d_monthly_limit == 6
}

# Test: FDIC insurance configuration
test_fdic_insured if {
	compliance.fdic_insured == true
}

test_fdic_limit if {
	compliance.fdic_limit == 250000
}

# Test: fraud_monitoring configuration
test_fraud_monitoring_enabled if {
	compliance.fraud_monitoring.enabled == true
}

test_fraud_monitoring_threshold if {
	compliance.fraud_monitoring.transaction_threshold == 1000
}

test_fraud_monitoring_geographic_check if {
	compliance.fraud_monitoring.geographic_check == true
}

test_fraud_monitoring_velocity_check if {
	compliance.fraud_monitoring.velocity_check == true
}

# Test: suspicious_transaction detection for high amounts
test_suspicious_transaction_high_amount if {
	compliance.suspicious_transaction with input as {
		"request": {"body": {"amount": 5000}}
	}
}

# Test: suspicious_transaction not triggered for low amounts
test_suspicious_transaction_low_amount if {
	not compliance.suspicious_transaction with input as {
		"request": {"body": {"amount": 500}}
	}
}

# Test: allow_read_terms for authenticated user
test_allow_read_terms_authenticated if {
	compliance.allow_read_terms with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/terms/privacy",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_read_terms denied for unauthenticated user
test_allow_read_terms_unauthenticated if {
	not compliance.allow_read_terms with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/terms/privacy",
				"headers": {},
			}
		}
	} with data.users as mock_users
}

# Test: allow_fraud_review for manager
test_allow_fraud_review_manager if {
	compliance.allow_fraud_review with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/fraud/alerts",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_fraud_review for senior representative
test_allow_fraud_review_senior_rep if {
	compliance.allow_fraud_review with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/fraud/alerts/123",
				"headers": {"authorization": "Bearer token-senior"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_fraud_review denied for regular representative
test_allow_fraud_review_denied_rep if {
	not compliance.allow_fraud_review with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/fraud/alerts",
				"headers": {"authorization": "Bearer token-rep"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_fraud_update for manager with admin:update permission
test_allow_fraud_update_manager if {
	compliance.allow_fraud_update with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/fraud/cases/CASE001",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_fraud_update denied for senior representative
test_allow_fraud_update_denied_senior_rep if {
	not compliance.allow_fraud_update with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/fraud/cases/CASE001",
				"headers": {"authorization": "Bearer token-senior"},
			}
		}
	} with data.users as mock_users
}

# Test: allow_fraud_update denied for wrong HTTP method
test_allow_fraud_update_wrong_method if {
	not compliance.allow_fraud_update with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/fraud/cases/CASE001",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
}

# Test: log_decision produces correct structure
test_log_decision_structure if {
	log := compliance.log_decision with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC123",
				"headers": {"authorization": "Bearer token-manager"},
			}
		}
	} with data.users as mock_users
	log.user == "manager1"
	log.role == "manager"
	log.resource == "/accounts/ACC123"
	log.action == "GET"
	log.organization == "retail"
	log.system == "retail_api"
}

# =============================================================================
# RETAIL CUSTOMER COMPLIANCE TESTS
# =============================================================================

# Test: customer can read terms and policies
test_customer_read_terms if {
	compliance.allow_read_terms with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/terms/privacy",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: customer cannot access fraud review (internal only)
test_customer_denied_fraud_review if {
	not compliance.allow_fraud_review with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/fraud/alerts",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: customer cannot update fraud cases (internal only)
test_customer_denied_fraud_update if {
	not compliance.allow_fraud_update with input as {
		"request": {
			"http": {
				"method": "PATCH",
				"path": "/fraud/cases/CASE001",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
}

# Test: inactive customer denied reading terms
test_inactive_customer_denied_terms if {
	not compliance.allow_read_terms with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/terms/privacy",
				"headers": {"authorization": "Bearer token-dan"},
			}
		}
	} with data.users as mock_users
}

# Test: log_decision captures customer activity
test_log_decision_customer if {
	log := compliance.log_decision with input as {
		"request": {
			"http": {
				"method": "GET",
				"path": "/accounts/ACC-R001",
				"headers": {"authorization": "Bearer token-alice"},
			}
		}
	} with data.users as mock_users
	log.user == "alice.consumer"
	log.role == "retail_customer"
	log.resource == "/accounts/ACC-R001"
	log.action == "GET"
}
