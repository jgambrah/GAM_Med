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
import { ChevronLeft, Coins, ShieldAlert } from 'lucide-react';
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

  // SAAS SECURITY CHECK: Prevent unauthorized cross-tenant data access via URL manipulation
  if (pricingTier && user && pricingTier.hospitalId !== user.hospitalId) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-destructive/5 rounded-2xl border-2 border-dashed border-destructive/20">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-black text-destructive uppercase tracking-tighter">Commercial Data Violation</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Pricing tiers and rate cards are sensitive facility data. You are not authorized to view the commercial structures of other hospitals.
            </p>
            <Button variant="outline" className="mt-6 font-bold" onClick={() => router.back()}>
                Exit Vault
            </Button>
        </div>
    );
  }

  if (!pricingTier) {
    notFound();
  }

  const rateCardEntries = Object.entries(pricingTier.rate_card);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
        </Button>
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Rate Card: {pricingTier.pricingId.toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-tighter mt-1">
                {pricingTier.description} | Facility: <strong>{pricingTier.hospitalId}</strong>
            </p>
        </div>
      </div>
      
      <Card className="shadow-lg border-none ring-1 ring-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-900 text-white pb-6">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">Service-Level Pricing List</CardTitle>
          </div>
          <CardDescription className="text-slate-400">
            Current negotiated prices for all clinical and administrative codes under this tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 bg-white">
            <div className="rounded-md overflow-hidden">
                <Table>
                <TableHeader className="bg-slate-50 border-b">
                    <TableRow>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">Billing Code</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Service Category</TableHead>
                    <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Negotiated Price</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rateCardEntries.length > 0 ? (
                        rateCardEntries.map(([code, price]) => (
                        <TableRow key={code} className="hover:bg-slate-50 transition-colors h-14">
                            <TableCell className="font-mono text-xs font-bold pl-6 text-primary">{code}</TableCell>
                            <TableCell className="text-sm font-medium text-slate-600">Standard Healthcare Service</TableCell>
                            <TableCell className="text-right pr-6 font-black text-slate-900 text-base">₵{price.toFixed(2)}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center italic text-muted-foreground">
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