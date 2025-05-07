"use client";

import { useAuth } from "@/providers/auth-provider";
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
  AlertCircle,
  Sparkles
} from "lucide-react";

export default function UserDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-mono text-[#333] mb-2">
              Welcome, {user?.first_name}!
            </h1>
            <p className="text-gray-600 font-mono">
              We&apos;re cooking up something magical for you.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              <Sparkles className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </div>
        </div>
      </div>

      {/* Coming soon message */}
      <div className="bg-white rounded-lg shadow-[0_8px_0_0_#333] border-2 border-[#333] p-6 relative transform hover:-translate-y-1 hover:shadow-[0_12px_0_0_#333] transition-all duration-200">
        <div className="flex flex-col items-center justify-center py-10">
          <Sparkles className="h-16 w-16 text-purple-500 mb-4" />
          <h2 className="text-2xl font-bold font-mono text-[#333] mb-2 text-center">
            Something Magical is Coming Soon!
          </h2>
          <p className="text-gray-600 font-mono text-center max-w-2xl mb-6">
            We&apos;re working hard to bring you an amazing experience. Our team is building something special just for you. 
            Stay tuned for updates - we&apos;ll notify you as soon as it&apos;s ready!
          </p>
          <div className="flex space-x-4">
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-[#333] bg-white hover:bg-[#fafafa] transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              <Bell className="mr-2 h-4 w-4" />
              Notify Me
            </Button>
            <Button className="border-2 border-[#333] shadow-[0_4px_0_0_#333] font-mono text-white bg-purple-500 hover:bg-purple-600 transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
              <Star className="mr-2 h-4 w-4" />
              Upgrade Account
            </Button>
          </div>
        </div>
      </div>

      {/* Features preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard 
          icon={<BookOpen className="h-6 w-6 text-blue-500" />}
          title="Learning Resources"
          description="Access a wide range of educational materials tailored to your interests."
        />
        <FeatureCard 
          icon={<Users className="h-6 w-6 text-green-500" />}
          title="Community Access"
          description="Connect with like-minded individuals and expand your network."
        />
        <FeatureCard 
          icon={<Award className="h-6 w-6 text-yellow-500" />}
          title="Achievements"
          description="Track your progress and earn recognition for your accomplishments."
        />
      </div>
    </div>
  );
}

// Helper component for feature cards
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white rounded-lg shadow-[0_4px_0_0_#333] border-2 border-[#333] p-4 relative transform hover:-translate-y-1 hover:shadow-[0_6px_0_0_#333] transition-all duration-200">
      <div className="flex items-center mb-3">
        <div className="bg-gray-100 p-2 rounded-md mr-3">
          {icon}
        </div>
        <h3 className="font-bold font-mono text-[#333]">{title}</h3>
      </div>
      <p className="text-sm font-mono text-gray-600">{description}</p>
    </div>
  );
}

// Additional icons
function Bell(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function Star(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
