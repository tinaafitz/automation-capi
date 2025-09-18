import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  ServerIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export function ClusterDetails() {
  const { id } = useParams();
  const [cluster, setCluster] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for cluster details
    setTimeout(() => {
      setCluster({
        id: id,
        name: 'production-cluster',
        status: 'ready',
        version: '4.20.0',
        region: 'us-west-2',
        created_at: '2024-01-15T10:30:00Z',
        network_automation: true,
        role_automation: false,
        config: {
          instance_type: 'm5.xlarge',
          min_replicas: 2,
          max_replicas: 5,
          cidr_block: '10.0.0.0/16',
          availability_zones: ['us-west-2a', 'us-west-2b']
        }
      });

      setJob({
        id: 'job-123',
        status: 'completed',
        progress: 100,
        message: 'Cluster creation completed successfully',
        started_at: '2024-01-15T10:30:00Z',
        completed_at: '2024-01-15T10:45:00Z',
        logs: [
          'Starting cluster creation...',
          'Creating VPC and subnets...',
          'Configuring security groups...',
          'Launching ROSA control plane...',
          'Configuring node pools...',
          'Cluster ready!'
        ]
      });

      setLoading(false);
    }, 1000);
  }, [id]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'creating':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Cluster not found</h3>
        <p className="mt-1 text-sm text-gray-500">The requested cluster could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ServerIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cluster.name}</h1>
              <p className="text-gray-600">Cluster ID: {cluster.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(cluster.status)}
            <span className="text-lg font-medium capitalize">{cluster.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cluster Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Cluster Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">OpenShift Version</dt>
              <dd className="text-sm text-gray-900">{cluster.version}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">AWS Region</dt>
              <dd className="text-sm text-gray-900">{cluster.region}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Instance Type</dt>
              <dd className="text-sm text-gray-900">{cluster.config.instance_type}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Node Scaling</dt>
              <dd className="text-sm text-gray-900">
                {cluster.config.min_replicas} - {cluster.config.max_replicas} nodes
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">
                {new Date(cluster.created_at).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Automation Features */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Automation Features</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">ROSANetwork (ACM-21174)</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                cluster.network_automation
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {cluster.network_automation ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">ROSARoleConfig (ACM-21162)</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                cluster.role_automation
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {cluster.role_automation ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {cluster.network_automation && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Network Configuration</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-xs text-gray-500">VPC CIDR</dt>
                  <dd className="text-sm text-gray-900">{cluster.config.cidr_block}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Availability Zones</dt>
                  <dd className="text-sm text-gray-900">
                    {cluster.config.availability_zones.join(', ')}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Job Progress */}
        {job && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Deployment Progress
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Status: {job.status}</span>
                  <span className="text-gray-500">{job.progress}%</span>
                </div>
                <div className="mt-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">{job.message}</p>
              </div>
              {job.completed_at && (
                <div className="text-xs text-gray-500">
                  Completed: {new Date(job.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Logs */}
        {job && job.logs && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Logs</h2>
            <div className="bg-gray-900 rounded-md p-4 h-64 overflow-y-auto">
              {job.logs.map((log, index) => (
                <div key={index} className="text-green-400 text-sm font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}