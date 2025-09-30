

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';


export function FinancialReportsDashboard() {

  return (
    <Card>
        <CardHeader>
            <CardTitle>Financial Reporting</CardTitle>
            <CardDescription>
                Generate key financial statements and reports.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
            <Button asChild className="mt-4">
                <Link href="/dashboard/admin/reports">
                    Go to Financial Reports
                </Link>
            </Button>
        </CardContent>
    </Card>
  );
}
