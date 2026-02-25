
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
import { ChevronLeft, Coins } from 'lucide-react';
import { mockPricingTables } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';

/**
 * == SaaS Rate Card Detail Viewer ==
 * 
 * Displays specific service prices for a selected pricing tier.
 * Enforces the SaaS Wall by verifying the tier belongs to the user's hospitalId.
 */
export default function RateCardDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useParams();
  const pricingId = params.pricingId as string;

  const pricingTier = React.useMemo(() => {
    return mockPricingTables.find((r) => r.pricingId === pricingId);
  }, [pricingId]);

  // SAAS SECURITY CHECK: Prevent unauthorized cross-tenant data access
  if (!pricingTier || (user && pricingTier.hospitalId !== user.hospitalId)) {
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
            <h1 className="text-3xl font-bold">Rate Card: {pricingTier.pricingId.toUpperCase()}</h1>
            <p className="text-muted-foreground">
                {pricingTier.description} | Facility: <strong>{pricingTier.hospitalId}</strong>
            </p>
        </div>
      </div>
      
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-600" />
            <CardTitle>Service-Level Pricing</CardTitle>
          </div>
          <CardDescription>
            A list of all services and their specific prices under this tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                    <TableHead>Billing Code</TableHead>
                    <TableHead>Service Category</TableHead>
                    <TableHead className="text-right">Negotiated Price</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rateCardEntries.length > 0 ? (
                        rateCardEntries.map(([code, price]) => (
                        <TableRow key={code}>
                            <TableCell className="font-mono text-xs font-bold">{code}</TableCell>
                            <TableCell className="text-sm">Standard Service</TableCell>
                            <TableCell className="text-right font-black text-blue-900">₵{price.toFixed(2)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center italic text-muted-foreground">
                                No prices defined for this rate card.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
