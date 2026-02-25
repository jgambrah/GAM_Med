
'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { mockPricingTables } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { Coins } from 'lucide-react';

/**
 * == SaaS Pricing Strategy Management ==
 * 
 * Allows hospital management to define and view pricing tiers (Private, NHIS, etc).
 * Enforces logical isolation by filtering tiers by hospitalId.
 */
export default function PricingListPage() {
  const { user } = useAuth();

  // SaaS LOGIC: Only show pricing tiers belonging to this facility
  const hospitalTiers = React.useMemo(() => {
    if (!user) return [];
    return mockPricingTables.filter(t => t.hospitalId === user.hospitalId);
  }, [user]);

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold">Pricing Management</h1>
        <p className="text-muted-foreground">
          View and manage flexible pricing tiers and rate cards for <strong>{user?.hospitalId}</strong>.
        </p>
      </div>
      <Card className="border-t-4 border-t-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <CardTitle>Pricing Tiers & Rate Cards</CardTitle>
          </div>
          <CardDescription>A list of all available pricing structures for your facility.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Pricing ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospitalTiers.length > 0 ? (
                    hospitalTiers.map((tier) => (
                    <TableRow key={tier.pricingId}>
                        <TableCell className="font-bold">{tier.pricingId.toUpperCase()}</TableCell>
                        <TableCell className="text-sm italic">{tier.description}</TableCell>
                        <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/pricing/${tier.pricingId}`}>
                            View Rate Card
                            </Link>
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-32 text-center text-muted-foreground italic">
                            No custom pricing tiers defined for your hospital.
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
