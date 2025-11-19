package main

import rego.v1

# EA Financial - Main OPA Policy Entry Point
# This policy aggregates authorization decisions from all organizational units

import data.commercial.dashboard.access_control as commercial_dashboard
import data.commercial.wholesale_api.authentication as commercial_auth
import data.commercial.wholesale_api.compliance as commercial_compliance
import data.commercial.wholesale_api.corporate_lending as commercial_lending
import data.commercial.wholesale_api.treasury as commercial_treasury
import data.ea_financial.identity_provider.mfa as mfa
import data.ea_financial.identity_provider.sso as sso
import data.ea_financial.identity_provider.user_management as user_mgmt
import data.retail.dashboard.access_control as retail_dashboard
import data.retail.retail_api.accounts as retail_accounts
import data.retail.retail_api.authentication as retail_auth
import data.retail.retail_api.compliance as retail_compliance
import data.retail.retail_api.transactions as retail_transactions
import data.shared.common
import data.wealth_mgmt.dashboard.access_control as wealth_dashboard
import data.wealth_mgmt.investing_api.authentication as wealth_auth
import data.wealth_mgmt.investing_api.compliance as wealth_compliance
import data.wealth_mgmt.investing_api.portfolio_management as wealth_portfolio
import data.wealth_mgmt.investing_api.trading as wealth_trading
import data.wealth_mgmt.portfolio_mgmt_app.access_control as wealth_app

# Default deny all requests
default allow := false

# Allow if common policies allow (health checks, OPTIONS)
allow if {
	common.allow
}

# ========================================
# RETAIL BANKING POLICIES
# ========================================

# Retail API Authentication
allow if {
	retail_auth.allow_login
}

allow if {
	retail_auth.allow_logout
}

allow if {
	retail_auth.allow_verify
}

# Retail API Accounts
allow if {
	retail_accounts.allow_read_account
}

allow if {
	retail_accounts.allow_read_balance
}

allow if {
	retail_accounts.allow_list_accounts
}

allow if {
	retail_accounts.allow_open_account
}

allow if {
	retail_accounts.allow_close_account
}

allow if {
	retail_accounts.allow_update_account_status
}

# Retail API Transactions
allow if {
	retail_transactions.allow_read_transactions
}

allow if {
	retail_transactions.allow_debit
}

allow if {
	retail_transactions.allow_credit
}

allow if {
	retail_transactions.allow_internal_transfer
}

allow if {
	retail_transactions.allow_manual_adjustment
}

allow if {
	retail_transactions.allow_large_adjustment
}

allow if {
	retail_transactions.allow_transaction_reversal
}

# Retail Compliance
allow if {
	retail_compliance.allow_read_terms
}

allow if {
	retail_compliance.allow_fraud_review
}

allow if {
	retail_compliance.allow_fraud_update
}

# Retail Dashboard
allow if {
	retail_dashboard.allow_dashboard_access
}

allow if {
	retail_dashboard.allow_view_customer
}

allow if {
	retail_dashboard.allow_edit_customer
}

allow if {
	retail_dashboard.allow_export_data
}

allow if {
	retail_dashboard.allow_admin_panel
}

allow if {
	retail_dashboard.allow_view_reports
}

# ========================================
# COMMERCIAL BANKING POLICIES
# ========================================

# Commercial API Authentication
allow if {
	commercial_auth.allow_login
}

allow if {
	commercial_auth.allow_token_refresh
}

# Commercial Corporate Lending
allow if {
	commercial_lending.allow_view_credit_lines
}

allow if {
	commercial_lending.allow_request_credit_line
}

allow if {
	commercial_lending.allow_approve_credit_line
}

allow if {
	commercial_lending.allow_loan_disbursement
}

allow if {
	commercial_lending.allow_view_loans
}

# Commercial Treasury
allow if {
	commercial_treasury.allow_wire_transfer
}

allow if {
	commercial_treasury.allow_fx_trade
}

allow if {
	commercial_treasury.allow_fx_trade_large
}

allow if {
	commercial_treasury.allow_cash_pooling
}

allow if {
	commercial_treasury.allow_liquidity_reports
}

allow if {
	commercial_treasury.allow_securities_lending
}

allow if {
	commercial_treasury.allow_derivatives
}

# Commercial Compliance
allow if {
	commercial_compliance.allow_compliance_reports
}

allow if {
	commercial_compliance.allow_sar_filing
}

allow if {
	commercial_compliance.allow_ctr_filing
}

allow if {
	commercial_compliance.allow_ofac_override
}

allow if {
	commercial_compliance.allow_regulatory_filing
}

# Commercial Dashboard
allow if {
	commercial_dashboard.allow_dashboard_access
}

allow if {
	commercial_dashboard.allow_view_client
}

allow if {
	commercial_dashboard.allow_approval_workflow
}

allow if {
	commercial_dashboard.allow_treasury_dashboard
}

allow if {
	commercial_dashboard.allow_compliance_dashboard
}

# ========================================
# WEALTH MANAGEMENT POLICIES
# ========================================

# Wealth Management Authentication
allow if {
	wealth_auth.allow_login
}

# Wealth Portfolio Management
allow if {
	wealth_portfolio.allow_view_portfolio
}

allow if {
	wealth_portfolio.allow_rebalance
}

allow if {
	wealth_portfolio.allow_allocation_change
}

allow if {
	wealth_portfolio.allow_performance_analytics
}

allow if {
	wealth_portfolio.allow_risk_assessment
}

# Wealth Trading
allow if {
	wealth_trading.allow_equity_trade
}

allow if {
	wealth_trading.allow_fixed_income_trade
}

allow if {
	wealth_trading.allow_options_trade
}

allow if {
	wealth_trading.allow_mutual_fund
}

allow if {
	wealth_trading.allow_alternative_investment
}

allow if {
	wealth_trading.allow_order_management
}

allow if {
	wealth_trading.allow_market_data
}

# Wealth Compliance
allow if {
	wealth_compliance.allow_finra_report
}

allow if {
	wealth_compliance.allow_form_adv
}

allow if {
	wealth_compliance.allow_trade_surveillance
}

allow if {
	wealth_compliance.allow_market_abuse_review
}

# Wealth App Access
allow if {
	wealth_app.allow_app_access
}

allow if {
	wealth_app.allow_client_portal
}

allow if {
	wealth_app.allow_advisor_workspace
}

allow if {
	wealth_app.allow_analytics_tools
}

allow if {
	wealth_app.allow_document_access
}

allow if {
	wealth_app.allow_performance_reports
}

allow if {
	wealth_app.allow_messaging
}

allow if {
	wealth_app.allow_scheduling
}

# Wealth Dashboard
allow if {
	wealth_dashboard.allow_dashboard_access
}

allow if {
	wealth_dashboard.allow_feature
}

allow if {
	wealth_dashboard.allow_firm_overview
}

allow if {
	wealth_dashboard.allow_team_management
}

allow if {
	wealth_dashboard.allow_client_book
}

allow if {
	wealth_dashboard.allow_compliance_view
}

# ========================================
# EA FINANCIAL IDENTITY PROVIDER
# ========================================

# SSO
allow if {
	sso.allow_sso_login
}

allow if {
	sso.allow_sso_callback
}

allow if {
	sso.allow_saml_assertion
}

allow if {
	sso.allow_oauth_token
}

allow if {
	sso.allow_session_refresh
}

allow if {
	sso.allow_sso_logout
}

allow if {
	sso.allow_cross_org_auth
}

# User Management
allow if {
	user_mgmt.allow_view_users
}

allow if {
	user_mgmt.allow_create_user
}

allow if {
	user_mgmt.allow_update_user
}

allow if {
	user_mgmt.allow_deactivate_user
}

allow if {
	user_mgmt.allow_self_update
}

allow if {
	user_mgmt.allow_role_assignment
}

allow if {
	user_mgmt.allow_group_management
}

# MFA
allow if {
	mfa.allow_mfa_enrollment
}

allow if {
	mfa.allow_mfa_verify
}

allow if {
	mfa.allow_mfa_management
}

allow if {
	mfa.allow_backup_codes
}

allow if {
	mfa.allow_mfa_reset
}

# ========================================
# AUDIT LOGGING
# ========================================

# Aggregate audit logs from all systems
logs := {
	"retail": retail_compliance.log_decision,
	"commercial": commercial_compliance.log_commercial_transaction,
	"wealth": wealth_compliance.log_wealth_transaction,
	"common": common.audit_log(user_claims, allow),
} if {
	user_claims := retail_auth.authenticated_claims
}
