
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
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { mockResources, mockWorkOrders, mockDepreciationRecords } from '@/lib/data';
import { Asset, WorkOrder, DepreciationRecord } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';

const DetailItem = ({ label, value, children }: { label: string; value?: string | number | null; children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {value && <p className="text-base font-semibold">{value}</p>}
        {children && <div className="text-base font-semibold">{children}</div>}
    </div>
);

const getStatusVariant = (status: Asset['status']): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
        case 'Operational': return 'secondary';
        case 'Under Maintenance': return 'default';
        case 'Needs Repair': return 'destructive';
        case 'Decommissioned': return 'outline';
        default: return 'outline';
    }
};

function WarrantyAlert({ warrantyEndDate }: { warrantyEndDate?: string }) {
    if (!warrantyEndDate) return null;

    const daysToExpiry = differenceInDays(parseISO(warrantyEndDate), new Date());

    if (daysToExpiry > 60 || daysToExpiry < 0) return null;

    const isExpiringSoon = daysToExpiry <= 30;

    return (
        <Card className={cn(
            'border-l-4',
            isExpiringSoon ? 'border-destructive bg-destructive/10' : 'border-yellow-500 bg-yellow-500/10'
        )}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                 <AlertTriangle className={cn('h-6 w-6', isExpiringSoon ? 'text-destructive' : 'text-yellow-600')} />
                 <div>
                    <CardTitle className={cn(isExpiringSoon ? 'text-destructive' : 'text-yellow-700')}>Warranty Alert</CardTitle>
                    <CardDescription className={cn(isExpiringSoon ? 'text-destructive/80' : 'text-yellow-700/80')}>
                        The warranty for this asset expires in {daysToExpiry} days on {format(parseISO(warrantyEndDate), 'PPP')}.
                    </CardDescription>
                 </div>
            </CardHeader>
        </Card>
    );
}

/**
 * == SaaS Asset Detail Viewer ==
 * 
 * Displays the full lifecycle data for a specific machine.
 * Enforces logical isolation by verifying the asset belongs to the user's hospitalId.
 */
export default function AssetDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useParams();
  const assetId = params.assetId as string;

  const asset = React.useMemo(() => {
    return mockResources.find((r) => r.assetId === assetId);
  }, [assetId]);

  // SAAS SECURITY CHECK: Prevent cross-tenant direct URL access
  if (!asset || (user && asset.hospitalId !== user.hospitalId)) {
    notFound();
  }

  const maintenanceHistory = mockWorkOrders.filter((req) => req.assetId === assetId);
  const depreciationHistory = mockDepreciationRecords.filter((rec) => rec.assetId === assetId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
        </Button>
        <div>
            <h1 className="text-3xl font-bold">{asset.name}</h1>
            <p className="text-muted-foreground">
                {asset.type} - ID: {asset.assetId} | Facility: <strong>{asset.hospitalId}</strong>
            </p>
        </div>
      </div>
      
      <WarrantyAlert warrantyEndDate={asset.warrantyEndDate} />
      
      <Tabs defaultValue="details">
        <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
            <TabsTrigger value="depreciation">Depreciation History</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Asset Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem label="Type" value={asset.type} />
                            <DetailItem label="Department" value={asset.department} />
                            <DetailItem label="Location" value={asset.location} />
                            <DetailItem label="Model Number" value={asset.modelNumber} />
                            <DetailItem label="Serial Number" value={asset.serialNumber} />
                            <DetailItem label="Status">
                                <Badge variant={getStatusVariant(asset.status)}>{asset.status}</Badge>
                            </DetailItem>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <CardTitle>Financial Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem label="Purchase Date" value={asset.purchaseDate ? format(parseISO(asset.purchaseDate), 'PPP') : 'N/A'} />
                            <DetailItem label="Purchase Cost" value={asset.purchaseCost ? `₵${asset.purchaseCost.toFixed(2)}` : 'N/A'} />
                            <DetailItem label="Warranty End Date" value={asset.warrantyEndDate ? format(parseISO(asset.warrantyEndDate), 'PPP') : 'N/A'} />
                            <DetailItem label="Current Book Value" value={asset.currentBookValue ? `₵${asset.currentBookValue.toFixed(2)}` : 'N/A'} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </TabsContent>
        <TabsContent value="maintenance" className="mt-4">
             <Card>
                <CardHeader>
                <CardTitle>Maintenance History</CardTitle>
                <CardDescription>
                    A log of all repair and maintenance activities for this asset.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maintenanceHistory.length > 0 ? (
                                maintenanceHistory.map(req => (
                                    <TableRow key={req.workOrderId}>
                                        <TableCell>{format(parseISO(req.dateReported), 'PPP')}</TableCell>
                                        <TableCell>{req.priority}</TableCell>
                                        <TableCell>{req.description}</TableCell>
                                        <TableCell><Badge variant={req.status === 'Resolved' ? 'secondary' : 'default'}>{req.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No maintenance history found for this asset.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="depreciation" className="mt-4">
             <Card>
                <CardHeader>
                <CardTitle>Depreciation History</CardTitle>
                <CardDescription>
                    An immutable log of all annual depreciation calculations for this asset.
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date Calculated</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Depreciation Amount</TableHead>
                                <TableHead className="text-right">Book Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {depreciationHistory.length > 0 ? (
                                depreciationHistory.map((rec, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{format(parseISO(rec.dateCalculated), 'PPP')}</TableCell>
                                        <TableCell>{rec.period}</TableCell>
                                        <TableCell className="text-right font-mono">₵{rec.depreciationAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">₵{rec.bookValue.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No depreciation history found for this asset.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
