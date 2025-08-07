
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ReferralForm() {
  return (
      <div className="space-y-4">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
          <p>This feature is being rebuilt.</p>
      </div>
  );
}
