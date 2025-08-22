
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { mockPricingTables } from '@/lib/data';

export default function RateCardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pricingId = params.pricingId as string;

  const pricingTier = mockPricingTables.find((r) => r.pricingId === pricingId);

  if (!pricingTier) {
    notFound();
  }

  const rateCardEntries = Object.entries(pricingTier.rate_card);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold">Rate Card: {pricingTier.pricingId}</h1>
            <p className="text-muted-foreground">
                {pricingTier.description}
            </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Service Prices</CardTitle>
          <CardDescription>
            A list of all services and their specific prices under this tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Billing Code</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rateCardEntries.map(([code, price]) => (
                    <TableRow key={code}>
                        <TableCell className="font-medium">{code}</TableCell>
                        <TableCell className="text-right">₵{price.toFixed(2)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
