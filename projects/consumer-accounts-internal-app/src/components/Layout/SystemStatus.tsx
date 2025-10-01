import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface SystemStatusProps {
  showDetails?: boolean;
  className?: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  dependencies: {
    opa: {
      status: string;
      url: string;
      error?: string;
    };
  };
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  showDetails = false,
  className = ''
}) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkSystemHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const healthData = await apiService.getHealth();
      setHealth(healthData as SystemHealth);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check system health');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();

    // Check system health every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'error':
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'error':
      case 'down':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'operational':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'degraded':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'error':
      case 'down':
        return `${baseClass} bg-red-100 text-red-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  if (loading && !health) {
    return (
      <div className={`system-status ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
          <span className="text-sm">Checking system status...</span>
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className={`system-status ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-red-600">
            <span>❌</span>
            <span className="text-sm font-medium">System Check Failed</span>
          </div>
          <button
            onClick={checkSystemHealth}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            disabled={loading}
          >
            Retry
          </button>
        </div>
        {showDetails && (
          <div className="mt-2 text-sm text-gray-600">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const isOpaDown = health.dependencies.opa.status === 'error';
  const systemDegraded = health.status === 'degraded';

  return (
    <div className={`system-status ${className}`}>
      {/* Compact Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span>{getStatusIcon(health.status)}</span>
            <span className="text-sm font-medium">System</span>
            <span className={getStatusBadgeClass(health.status)}>
              {health.status}
            </span>
          </div>

          {isOpaDown && (
            <div className="flex items-center space-x-1">
              <span>🔒</span>
              <span className="text-sm text-red-600 font-medium">Auth Service Down</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {lastChecked && (
            <span className="text-xs text-gray-500">
              {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={checkSystemHealth}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            title="Refresh status"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            ) : (
              '🔄'
            )}
          </button>
        </div>
      </div>

      {/* Critical Alerts */}
      {isOpaDown && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Authorization Service Unavailable
              </h4>
              <p className="text-sm text-red-700 mt-1">
                The Open Policy Agent (OPA) authorization service is not responding.
                Login and most banking operations will be unavailable until this service is restored.
              </p>
              <div className="mt-2 text-xs text-red-600">
                <strong>Service URL:</strong> {health.dependencies.opa.url}
              </div>
              {health.dependencies.opa.error && (
                <div className="mt-1 text-xs text-red-600">
                  <strong>Error:</strong> {health.dependencies.opa.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Status (when requested) */}
      {showDetails && (
        <div className="mt-4 space-y-3">
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">System Details</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-gray-500">Service:</span> {health.service}
              </div>
              <div>
                <span className="text-gray-500">Version:</span> {health.version}
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className={`ml-1 ${getStatusColor(health.status)}`}>
                  {health.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last Updated:</span>
                {new Date(health.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>

          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Service Dependencies</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(health.dependencies.opa.status)}</span>
                  <span className="font-medium">Open Policy Agent (OPA)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={getStatusBadgeClass(health.dependencies.opa.status)}>
                    {health.dependencies.opa.status}
                  </span>
                </div>
              </div>
              {health.dependencies.opa.error && (
                <div className="text-xs text-red-600 pl-4">
                  {health.dependencies.opa.error}
                </div>
              )}
            </div>
          </div>

          {systemDegraded && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>System Running in Degraded Mode</strong><br />
                Some services may be unavailable or operating with reduced functionality.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
