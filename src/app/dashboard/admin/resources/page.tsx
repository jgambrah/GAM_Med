
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockResources } from '@/lib/data';
import { Asset } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddMaintenanceRequestDialog } from './components/add-maintenance-request-dialog';
import { FacilityZonesDashboard } from './components/facility-zones-dashboard';
import { format, parseISO, differenceInDays } from 'date-fns';
import { AddAssetDialog } from './components/add-asset-dialog';
import { UtilitiesDashboard } from './components/utilities-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { PackageSearch } from 'lucide-react';

const getStatusVariant = (status: Asset['status']): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
        case 'Operational': return 'secondary';
        case 'Under Maintenance': return 'default';
        case 'Needs Repair': return 'destructive';
        case 'Decommissioned': return 'outline';
        default: return 'outline';
    }
}

function AssetCatalog() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [assets, setAssets] = React.useState<Asset[]>([]);

  // SaaS LOGIC: Only show assets for this hospital
  const hospitalResources = React.useMemo(() => {
    if (!user) return [];
    return mockResources.filter(r => r.hospitalId === user.hospitalId);
  }, [user]);

  React.useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = hospitalResources.filter(asset => 
      asset.name.toLowerCase().includes(lowercasedQuery) ||
      asset.assetId.toLowerCase().includes(lowercasedQuery) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(lowercasedQuery)) ||
      asset.type.toLowerCase().includes(lowercasedQuery) ||
      asset.department.toLowerCase().includes(lowercasedQuery)
    );
    setAssets(filtered);
  }, [searchQuery, hospitalResources]);

  const handleAssetCreated = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
  };

  const getRowClass = (asset: Asset) => {
    if (asset.status === 'Needs Repair') return 'bg-destructive/10 hover:bg-destructive/20';
    if (asset.status === 'Under Maintenance') return 'bg-yellow-500/10 hover:bg-yellow-500/20';
    
    const nextServiceDate = asset.maintenanceSchedule?.[0]?.nextServiceDate;
    if (nextServiceDate) {
        const daysToNextService = differenceInDays(parseISO(nextServiceDate), new Date());
        if (daysToNextService <= 30 && daysToNextService >= 0) return 'bg-yellow-400/10 hover:bg-yellow-400/20';
    }
    return '';
  };


  return (
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <div>
                    <CardTitle>Asset Register</CardTitle>
                    <CardDescription>A comprehensive list of all hospital assets and equipment for <strong>{user?.hospitalId}</strong>.</CardDescription>
                 </div>
                 <div className="flex gap-2">
                    <Input
                        placeholder="Search by name, ID, serial number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                    <AddAssetDialog onAssetCreated={handleAssetCreated} />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Purchase Cost</TableHead>
                  <TableHead className="text-right">Current Book Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.length > 0 ? (
                    assets.map((asset) => (
                    <TableRow key={asset.assetId} className={cn(getRowClass(asset))}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.department}</TableCell>
                        <TableCell>
                        <Badge variant={getStatusVariant(asset.status)}>
                            {asset.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {asset.purchaseCost ? `₵${asset.purchaseCost.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            {asset.currentBookValue ? `₵${asset.currentBookValue.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/admin/resources/${asset.assetId}`}>
                            View Details
                            </Link>
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                            <PackageSearch className="h-12 w-12 mx-auto opacity-20 mb-2" />
                            <p>No assets found for your facility.</p>
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
  )
}


export default function ResourceListPage() {
  const { user } = useAuth();
  
  // SaaS LOGIC: Only calculate stats for this hospital
  const hospitalResources = React.useMemo(() => {
    if (!user) return [];
    return mockResources.filter(r => r.hospitalId === user.hospitalId);
  }, [user]);

  const totalAssets = hospitalResources.length;
  const operationalAssets = hospitalResources.filter(r => r.status === 'Operational').length;
  const maintenanceAssets = hospitalResources.filter(r => r.status === 'Under Maintenance' || r.status === 'Needs Repair').length;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold">Asset &amp; Facilities Management</h1>
                <p className="text-muted-foreground">
                View assets, equipment, and manage facility zones for <strong>{user?.hospitalId}</strong>.
                </p>
            </div>
             <AddMaintenanceRequestDialog />
       </div>

       <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalAssets}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Operational Assets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{operationalAssets}</div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{maintenanceAssets}</div>
                </CardContent>
            </Card>
       </div>
        <Tabs defaultValue="catalog">
            <TabsList>
                <TabsTrigger value="catalog">Asset Register</TabsTrigger>
                <TabsTrigger value="zones">Facility Zones</TabsTrigger>
                <TabsTrigger value="utilities">Utilities</TabsTrigger>
            </TabsList>
            <TabsContent value="catalog" className="mt-4">
                <AssetCatalog />
            </TabsContent>
            <TabsContent value="zones" className="mt-4">
                <FacilityZonesDashboard />
            </TabsContent>
            <TabsContent value="utilities" className="mt-4">
                <UtilitiesDashboard />
            </TabsContent>
        </Tabs>
    </div>
  );
}
