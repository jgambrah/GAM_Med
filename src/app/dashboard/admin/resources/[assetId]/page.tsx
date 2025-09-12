
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
import { mockResources, mockMaintenanceRequests } from '@/lib/data';
import { Asset, MaintenanceRequest } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    const variant = isExpiringSoon ? 'destructive' : 'default';

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

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetId = params.assetId as string;

  const asset = mockResources.find((r) => r.assetId === assetId);
  const maintenanceHistory = mockMaintenanceRequests.filter((req) => req.equipmentId === assetId);

  if (!asset) {
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
            <h1 className="text-3xl font-bold">{asset.name}</h1>
            <p className="text-muted-foreground">
                {asset.type} - ID: {asset.assetId}
            </p>
        </div>
      </div>
      
      <WarrantyAlert warrantyEndDate={asset.warrantyEndDate} />
      
      <Tabs defaultValue="details">
        <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
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
                            <DetailItem label="Current Depreciated Value" value={asset.currentValue ? `₵${asset.currentValue.toFixed(2)}` : 'N/A'} />
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
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maintenanceHistory.length > 0 ? (
                                maintenanceHistory.map(req => (
                                    <TableRow key={req.requestId}>
                                        <TableCell>{format(parseISO(req.dateRequested), 'PPP')}</TableCell>
                                        <TableCell>{req.requestType}</TableCell>
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
      </Tabs>
    </div>
  );
}
