"use client";

import { NotFound } from "@/components/ui/not-found";

export default function AnalyticsPage() {
  return (
    <NotFound 
      title="Analytics Feature"
      description="This feature is currently under development. Please check back later."
      backUrl="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
} 