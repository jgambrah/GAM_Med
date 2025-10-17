
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SupplierDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Supplier Portal</h1>
        <p className="text-muted-foreground">
          Welcome to your portal for managing Requests for Quotation (RFQs).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Requests for Quotation</CardTitle>
          <CardDescription>
            A list of all open RFQs you can bid on will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">RFQ list coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
