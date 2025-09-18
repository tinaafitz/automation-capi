import React from 'react';
import { Link } from 'react-router-dom';
import {
  CloudIcon,
  ServerIcon,
  ChartBarIcon,
  PlusIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export function Dashboard() {
  const features = [
    {
      title: 'ROSANetwork Automation',
      description: 'Automated VPC and subnet creation using CloudFormation templates',
      icon: GlobeAltIcon,
      badge: 'ACM-21174',
      color: 'bg-blue-500'
    },
    {
      title: 'ROSARoleConfig Automation',
      description: 'Automated AWS IAM role and OIDC provider management',
      icon: ShieldCheckIcon,
      badge: 'ACM-21162',
      color: 'bg-green-500'
    },
    {
      title: 'OpenShift 4.20 Ready',
      description: 'Optimized for the latest OpenShift version with enhanced features',
      icon: CloudIcon,
      badge: 'Latest',
      color: 'bg-purple-500'
    }
  ];

  const quickActions = [
    {
      title: 'Create New Cluster',
      description: 'Launch a new ROSA HCP cluster with automation',
      href: '/clusters/create',
      icon: PlusIcon,
      color: 'bg-red-600 hover:bg-red-700'
    },
    {
      title: 'View Clusters',
      description: 'Manage and monitor existing clusters',
      href: '/clusters',
      icon: ServerIcon,
      color: 'bg-blue-600 hover:bg-blue-700'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">ROSA Automation Platform</h1>
        <p className="mt-4 text-xl text-gray-600">
          Streamlined Red Hat OpenShift Service on AWS cluster management
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.href}
              className={`${action.color} text-white rounded-lg p-6 transition-colors duration-200 block`}
            >
              <div className="flex items-start">
                <Icon className="h-8 w-8 mr-4 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold">{action.title}</h3>
                  <p className="mt-2 text-white/90">{action.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Features Overview */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Automation Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start">
                  <div className={`${feature.color} rounded-lg p-3 mr-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                      <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {feature.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Configure AWS Credentials</h4>
              <p className="text-gray-600">Ensure your AWS credentials are configured for ROSA operations</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Choose Automation Features</h4>
              <p className="text-gray-600">Select ROSANetwork and/or ROSARoleConfig automation based on your needs</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-1">
              3
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Create Your Cluster</h4>
              <p className="text-gray-600">Use the guided cluster creation wizard to deploy your ROSA HCP cluster</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">✓</div>
            <div className="text-sm text-gray-600">API Status</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">4.20</div>
            <div className="text-sm text-gray-600">OpenShift Version</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">AWS</div>
            <div className="text-sm text-gray-600">Cloud Provider</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">ROSA</div>
            <div className="text-sm text-gray-600">Service Type</div>
          </div>
        </div>
      </div>
    </div>
  );
}