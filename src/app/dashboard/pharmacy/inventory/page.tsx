'use client';

import * as React from 'react';
import { InventoryTable } from './components/inventory-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/**
 * == SaaS Pharmacy: Inventory Management ==
 * 
 * Standalone sub-page for managing the facility's drug registry.
 * Enforces logical isolation via the SaaS Wall.
 */
export default function PharmacyInventoryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drug Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Manage real-time stock levels for <strong>{user?.hospitalId}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search catalog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white"
                />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Add New Stock
            </Button>
        </div>
      </div>

      <InventoryTable searchQuery={searchQuery} />
    </div>
  );
}
