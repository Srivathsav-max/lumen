"use client";

import { useEffect, useState } from "react";

// Define available features
export type DashboardFeature = 
  | "home" 
  | "analytics" 
  | "calendar" 
  | "courses" 
  | "settings"
  | "profile"
  | "notifications"
  | "waitlist";

interface FeatureRouterProps {
  feature: DashboardFeature;
  children: React.ReactNode;
}

export function FeatureRouter({ feature, children }: FeatureRouterProps) {
  const [currentFeature, setCurrentFeature] = useState<DashboardFeature>(feature);
  
  // Update current feature when prop changes
  useEffect(() => {
    setCurrentFeature(feature);
  }, [feature]);
  
  // Render children (actual page content)
  return <>{children}</>;
}
