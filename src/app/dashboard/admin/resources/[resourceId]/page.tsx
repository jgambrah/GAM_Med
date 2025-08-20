
'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { mockResources, mockResourceBookings } from '@/lib/data';
import { ResourceCalendar } from '../components/resource-calendar';

export default function ResourceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const resourceId = params.resourceId as string;

  const resource = mockResources.find((r) => r.resourceId === resourceId);
  const bookings = mockResourceBookings.filter((b) => b.resourceId === resourceId);

  if (!resource) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold">{resource.name}</h1>
            <p className="text-muted-foreground">
                {resource.type} - {resource.department}
            </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Booking Calendar</CardTitle>
          <CardDescription>
            A real-time schedule of all bookings for this resource.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <ResourceCalendar bookings={bookings} />
        </CardContent>
      </Card>
    </div>
  );
}
