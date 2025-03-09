'use client';

import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <h2 className="text-lg font-medium text-gray-900">Welcome to Investor CRM</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your investor data and startup Q&A efficiently.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href="/dashboard/investors"
          className="block bg-white shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Investor CRM</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload, manage, and track investor data efficiently.
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/qa"
          className="block bg-white shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">Startup Q&A</h3>
            <p className="mt-1 text-sm text-gray-500">
              Organize and access your startup-related questions and answers.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
} 