
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
import { Resource } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaintenanceDashboard } from './components/maintenance-dashboard';
import { AddMaintenanceRequestDialog } from './components/add-maintenance-request-dialog';


const getStatusVariant = (status: Resource['status']): "secondary" | "default" | "destructive" | "outline" => {
    switch (status) {
        case 'Operational': return 'secondary';
        case 'Under Maintenance': return 'default';
        case 'Needs Repair': return 'destructive';
        case 'Decommissioned': return 'outline';
        default: return 'outline';
    }
}

function AssetCatalog() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filteredResources, setFilteredResources] = React.useState<Resource[]>(mockResources);

  React.useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = mockResources.filter(resource => 
      resource.name.toLowerCase().includes(lowercasedQuery) ||
      resource.type.toLowerCase().includes(lowercasedQuery) ||
      resource.department.toLowerCase().includes(lowercasedQuery)
    );
    setFilteredResources(filtered);
  }, [searchQuery]);


  return (
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <div>
                    <CardTitle>Asset Catalog</CardTitle>
                    <CardDescription>A list of all hospital assets and equipment.</CardDescription>
                 </div>
                  <div className="w-full sm:w-auto">
                    <Input
                        placeholder="Search by name, type, or dept..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource) => (
                  <TableRow key={resource.resourceId} className={cn(
                      resource.status === 'Needs Repair' && 'bg-destructive/10',
                      resource.status === 'Under Maintenance' && 'bg-yellow-500/10'
                  )}>
                    <TableCell className="font-medium">{resource.name}</TableCell>
                    <TableCell>{resource.type}</TableCell>
                    <TableCell>{resource.department}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(resource.status)}>
                        {resource.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin/resources/${resource.resourceId}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
  )
}


export default function ResourceListPage() {
  const totalAssets = mockResources.length;
  const operationalAssets = mockResources.filter(r => r.status === 'Operational').length;
  const maintenanceAssets = mockResources.filter(r => r.status === 'Under Maintenance' || r.status === 'Needs Repair').length;

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold">Asset &amp; Facilities Management</h1>
                <p className="text-muted-foreground">
                View assets, equipment, and manage maintenance requests.
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
                <TabsTrigger value="catalog">Asset Catalog</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance Requests</TabsTrigger>
            </TabsList>
            <TabsContent value="catalog" className="mt-4">
                <AssetCatalog />
            </TabsContent>
            <TabsContent value="maintenance" className="mt-4">
                <MaintenanceDashboard />
            </TabsContent>
        </Tabs>
    </div>
  );
}
