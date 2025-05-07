"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  BookOpen, 
  BarChart2, 
  Calendar, 
  Users, 
  Award, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  // Mock data for dashboard
  const stats = [
    { label: "Courses Enrolled", value: 5, icon: <BookOpen className="w-5 h-5" />, color: "bg-blue-500" },
    { label: "Completed Courses", value: 2, icon: <CheckCircle className="w-5 h-5" />, color: "bg-green-500" },
    { label: "Upcoming Deadlines", value: 3, icon: <AlertCircle className="w-5 h-5" />, color: "bg-red-500" },
    { label: "Hours Studied", value: 42, icon: <Clock className="w-5 h-5" />, color: "bg-purple-500" },
  ];

  const activities = [
    { id: 1, title: "Calculus Quiz", type: "quiz", date: "Today", course: "Advanced Mathematics" },
    { id: 2, title: "Physics Lab Report", type: "assignment", date: "Tomorrow", course: "Physics 101" },
    { id: 3, title: "Literature Essay", type: "assignment", date: "May 10", course: "World Literature" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono text-[#333] mb-2">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="text-gray-600 font-mono">
              Here's what's happening with your learning journey today.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Progress Report
            </Button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow-[0_4px_0_0_#333] border-2 border-[#333] p-4 relative transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200"
          >
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-md text-white mr-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-mono text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold font-mono text-[#333]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Upcoming activities */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
            <h2 className="text-xl font-bold font-mono text-[#333] mb-4 flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Activities
            </h2>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="border-2 border-[#333] rounded-md p-4 shadow-[0_4px_0_0_#333] hover:shadow-[0_6px_0_0_#333] hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-mono font-medium text-lg text-[#333]">{activity.title}</h3>
                      <p className="text-sm font-mono text-gray-600">{activity.course}</p>
                    </div>
                    <div className="bg-[#333] text-white text-xs font-mono px-2 py-1 rounded uppercase">
                      {activity.date}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="inline-block bg-gray-100 text-[#333] text-xs font-mono px-2 py-1 rounded uppercase">
                      {activity.type}
                    </span>
                    <Link 
                      href="#" 
                      className="text-[#333] font-mono text-sm hover:underline"
                    >
                      View details
                    </Link>
                  </div>
                </div>
              ))}
              <div className="text-center mt-4">
                <Link 
                  href="#" 
                  className="text-[#333] font-mono text-sm hover:underline inline-flex items-center"
                >
                  View all activities
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Quick stats and achievements */}
        <div className="space-y-6">
          {/* Course progress */}
          <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
            <h2 className="text-xl font-bold font-mono text-[#333] mb-4 flex items-center">
              <BarChart2 className="mr-2 h-5 w-5" />
              Course Progress
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-mono text-gray-600">Physics 101</span>
                  <span className="text-sm font-mono text-gray-600">75%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-mono text-gray-600">Advanced Mathematics</span>
                  <span className="text-sm font-mono text-gray-600">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-mono text-gray-600">World Literature</span>
                  <span className="text-sm font-mono text-gray-600">90%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '90%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent achievements */}
          <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
            <h2 className="text-xl font-bold font-mono text-[#333] mb-4 flex items-center">
              <Award className="mr-2 h-5 w-5" />
              Recent Achievements
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-2 rounded-full mr-3">
                  <Award className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium text-[#333]">Perfect Score</p>
                  <p className="text-xs font-mono text-gray-500">Physics Quiz #3</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium text-[#333]">Early Submission</p>
                  <p className="text-xs font-mono text-gray-500">Literature Essay</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium text-[#333]">Course Completed</p>
                  <p className="text-xs font-mono text-gray-500">Intro to Programming</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
