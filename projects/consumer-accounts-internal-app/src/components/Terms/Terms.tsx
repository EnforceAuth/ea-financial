import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';

interface TermsSection {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
  version: string;
}

interface TermsData {
  general: TermsSection[];
  employeeProcedures: TermsSection[];
  regulatory: TermsSection[];
  accountPolicies: TermsSection[];
  transactionLimits: TermsSection[];
}

interface TermsState {
  data: TermsData | null;
  loading: boolean;
  error: string | null;
  activeTab: string;
  searchTerm: string;
  expandedSections: Set<string>;
}

const Terms: React.FC = () => {
  const navigate = useNavigate();

  const [state, setState] = useState<TermsState>({
    data: null,
    loading: true,
    error: null,
    activeTab: 'general',
    searchTerm: '',
    expandedSections: new Set(),
  });

  useEffect(() => {
    loadTermsData();
  }, []);

  const loadTermsData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const termsData = await apiService.getAllTerms();

      setState(prev => ({
        ...prev,
        data: termsData,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load terms and policies',
      }));
    }
  };

  const handleTabChange = (tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const handleSearchChange = (searchTerm: string) => {
    setState(prev => ({ ...prev, searchTerm }));
  };

  const toggleSection = (sectionId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedSections);
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId);
      } else {
        newExpanded.add(sectionId);
      }
      return { ...prev, expandedSections: newExpanded };
    });
  };

  const expandAllSections = () => {
    if (!state.data) return;

    const currentTabData = state.data[state.activeTab as keyof TermsData] || [];
    const allSectionIds = currentTabData.map(section => section.id);

    setState(prev => ({
      ...prev,
      expandedSections: new Set(allSectionIds),
    }));
  };

  const collapseAllSections = () => {
    setState(prev => ({
      ...prev,
      expandedSections: new Set(),
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <mark key={index} className="search-highlight">{part}</mark>;
      }
      return part;
    });
  };

  const filterSections = (sections: TermsSection[]) => {
    if (!state.searchTerm) return sections;

    const searchLower = state.searchTerm.toLowerCase();
    return sections.filter(section =>
      section.title.toLowerCase().includes(searchLower) ||
      section.content.toLowerCase().includes(searchLower)
    );
  };

  const tabs = [
    { key: 'general', label: 'General Terms', icon: '📄' },
    { key: 'employeeProcedures', label: 'Employee Procedures', icon: '👥' },
    { key: 'regulatory', label: 'Regulatory', icon: '⚖️' },
    { key: 'accountPolicies', label: 'Account Policies', icon: '🏦' },
    { key: 'transactionLimits', label: 'Transaction Limits', icon: '💰' },
  ];

  if (state.loading) {
    return (
      <div className="terms-loading">
        <div className="loading-spinner"></div>
        <p>Loading terms and policies...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="terms-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Error Loading Terms</h2>
          <p>{state.error}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/dashboard')} className="secondary-button">
              Return to Dashboard
            </button>
            <button onClick={loadTermsData} className="primary-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state.data) {
    return (
      <div className="terms-not-found">
        <div className="not-found-content">
          <div className="not-found-icon">📭</div>
          <h2>No Terms Available</h2>
          <p>Terms and policies could not be loaded.</p>
          <button onClick={() => navigate('/dashboard')} className="primary-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentTabData = state.data[state.activeTab as keyof TermsData] || [];
  const filteredSections = filterSections(currentTabData);

  return (
    <div className="terms">
      <div className="terms-header">
        <div className="header-left">
          <button
            onClick={() => navigate('/dashboard')}
            className="back-button"
            aria-label="Back to Dashboard"
          >
            ← Back
          </button>
          <div className="terms-title">
            <div className="terms-icon">📋</div>
            <div className="title-content">
              <h1>Terms & Policies</h1>
              <p>Banking policies, procedures, and regulatory information</p>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search terms and policies..."
              value={state.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
        </div>
      </div>

      <div className="terms-content">
        {/* Navigation Tabs */}
        <div className="terms-nav">
          <div className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`nav-tab ${state.activeTab === tab.key ? 'active' : ''}`}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="nav-actions">
            <button
              onClick={expandAllSections}
              className="expand-button"
              title="Expand All Sections"
            >
              📖 Expand All
            </button>
            <button
              onClick={collapseAllSections}
              className="collapse-button"
              title="Collapse All Sections"
            >
              📚 Collapse All
            </button>
          </div>
        </div>

        {/* Terms Content */}
        <div className="terms-main">
          {state.searchTerm && (
            <div className="search-results-header">
              <h3>Search Results</h3>
              <p>
                {filteredSections.length} section{filteredSections.length !== 1 ? 's' : ''} found
                for "{state.searchTerm}"
              </p>
              {filteredSections.length === 0 && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="clear-search-button"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {filteredSections.length === 0 ? (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No Results Found</h3>
              <p>
                No sections match your search term "{state.searchTerm}".
                Try different keywords or clear the search to view all sections.
              </p>
              <button
                onClick={() => handleSearchChange('')}
                className="primary-button"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="terms-sections">
              {filteredSections.map((section) => {
                const isExpanded = state.expandedSections.has(section.id);

                return (
                  <div key={section.id} className="terms-section">
                    <div
                      className="section-header"
                      onClick={() => toggleSection(section.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection(section.id);
                        }
                      }}
                    >
                      <div className="section-title">
                        <span className="expand-icon">
                          {isExpanded ? '📖' : '📚'}
                        </span>
                        <h3>{highlightSearchTerm(section.title, state.searchTerm)}</h3>
                      </div>

                      <div className="section-meta">
                        <span className="section-version">v{section.version}</span>
                        <span className="section-date">
                          Updated: {formatDate(section.lastUpdated)}
                        </span>
                        <span className="expand-indicator">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="section-content">
                        <div className="content-text">
                          {highlightSearchTerm(section.content, state.searchTerm)}
                        </div>

                        <div className="content-footer">
                          <div className="section-info">
                            <span className="info-item">
                              <strong>Version:</strong> {section.version}
                            </span>
                            <span className="info-item">
                              <strong>Last Updated:</strong> {formatDate(section.lastUpdated)}
                            </span>
                            <span className="info-item">
                              <strong>Section ID:</strong> {section.id}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="terms-footer">
          <div className="footer-content">
            <div className="footer-info">
              <h4>Important Notice</h4>
              <p>
                These terms and policies are for internal EA Financial employee use only.
                All information contained herein is confidential and proprietary.
                Please ensure compliance with all applicable regulations and procedures.
              </p>
            </div>

            <div className="footer-actions">
              <button
                onClick={() => window.print()}
                className="print-button"
                title="Print Current Section"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
