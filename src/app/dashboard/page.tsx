"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Plus,
  BarChart3,
  Calendar,
  Settings
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Welcome back, {user?.first_name || user?.username || 'User'}!
            </h1>
            <p className="text-gray-600">
              Your dashboard is ready to be customized.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Placeholder cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm">
            View your data and insights here.
          </p>
          <Button variant="outline" className="mt-4 w-full">
            View Analytics
          </Button>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Calendar</h3>
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm">
            Manage your schedule and events.
          </p>
          <Button variant="outline" className="mt-4 w-full">
            Open Calendar
          </Button>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Settings</h3>
            <Settings className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-gray-600 text-sm">
            Configure your preferences.
          </p>
          <Button variant="outline" className="mt-4 w-full">
            Manage Settings
          </Button>
        </div>
      </div>

      {/* Main content placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Dashboard Content
          </h3>
          <p className="text-gray-600 mb-6">
            This is your main dashboard area. Add your content and components here.
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Content
          </Button>
        </div>
      </div>
    </div>
  );
}
