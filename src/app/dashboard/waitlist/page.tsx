"use client";

import { WaitlistTable } from "./waitlist-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function WaitlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Waitlist Management</h1>
        <p className="text-muted-foreground">
          Manage user waitlist entries and approvals.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Waitlist Entries
          </CardTitle>
          <CardDescription>
            View and manage all waitlist applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaitlistTable />
        </CardContent>
      </Card>
    </div>
  );
} 