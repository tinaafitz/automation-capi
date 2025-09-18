import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ServerIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Clusters', href: '/clusters', icon: ServerIcon },
  { name: 'Create Cluster', href: '/clusters/create', icon: PlusIcon },
];

export function Navigation() {
  const location = useLocation();

  function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <nav className="bg-red-600 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center space-x-2">
                <Cog6ToothIcon className="h-8 w-8 text-white" />
                <h1 className="text-xl font-bold text-white">ROSA Automation</h1>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={classNames(
                      location.pathname === item.href
                        ? 'border-white text-white'
                        : 'border-transparent text-red-100 hover:border-red-200 hover:text-white',
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium space-x-1'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-red-100 text-sm">OpenShift 4.20</span>
          </div>
        </div>
      </div>
    </nav>
  );
}