"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  Bell,
  MessageSquare,
  Trophy,
  Target,
  Zap,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function UserDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                  Welcome back, {user?.first_name}! 👋
                </h1>
                <p className="text-gray-600">
                  Ready to continue your learning journey?
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Section */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">Coming Soon!</h2>
                  <p className="text-gray-700 mb-3">
                    We&apos;re working hard to bring you an amazing learning experience. Stay tuned for exciting updates!
                  </p>
                </div>
              </div>
              <Button className="shrink-0">
                Get Notified
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Features Preview</h2>
            <p className="text-gray-600">Explore what&apos;s coming to enhance your learning experience</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={BookOpen}
              title="Course Management"
              description="Create, organize, and track your courses with our intuitive course builder."
              status="coming-soon"
            />
            
            <FeatureCard
              icon={Users}
              title="Student Analytics"
              description="Monitor student progress and engagement with detailed analytics."
              status="coming-soon"
            />
            
            <FeatureCard
              icon={Calendar}
              title="Smart Scheduling"
              description="AI-powered scheduling that adapts to your learning pace."
              status="beta"
            />
            
            <FeatureCard
              icon={BarChart3}
              title="Performance Insights"
              description="Get detailed insights into your learning patterns and progress."
              status="coming-soon"
            />
            
            <FeatureCard
              icon={MessageSquare}
              title="Interactive Discussions"
              description="Engage with peers and instructors in real-time discussions."
              status="coming-soon"
            />
            
            <FeatureCard
              icon={Trophy}
              title="Achievement System"
              description="Earn badges and certificates as you complete your learning goals."
              status="available"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const FeatureCard = ({ icon: Icon, title, description, status }: {
  icon: any;
  title: string;
  description: string;
  status: "coming-soon" | "available" | "beta";
}) => (
  <Card className="group hover:shadow-sm transition-all duration-200 border-gray-200">
    <CardContent className="p-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
            <Badge 
              variant={status === "available" ? "default" : status === "beta" ? "secondary" : "outline"}
              className="text-xs"
            >
              {status === "available" ? "Available" : status === "beta" ? "Beta" : "Coming Soon"}
            </Badge>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
