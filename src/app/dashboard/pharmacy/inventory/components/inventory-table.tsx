'use client';

import * as React from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { InventoryItem } from '@/lib/types';
import { format } from 'date-fns';
import { PackageSearch, AlertTriangle, Loader2 } from 'lucide-react';

interface InventoryTableProps {
  searchQuery: string;
}

/**
 * == Live Inventory Catalog ==
 * 
 * Displays the hospital's private stock of drugs and medical supplies.
 * Enforces strict SaaS isolation via the hospitalId filter.
 */
export function InventoryTable({ searchQuery }: InventoryTableProps) {
  const { user } = useAuth();
  const firestore = useFirestore();

  // LIVE QUERY: Hospital-specific inventory
  const invQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'inventory'),
        where('hospitalId', '==', user.hospitalId),
        orderBy('name', 'asc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: rawItems, isLoading } = useCollection<InventoryItem>(invQuery);

  // Local filtering for search (prefix search equivalent)
  const filteredItems = React.useMemo(() => {
    if (!rawItems) return [];
    if (!searchQuery) return rawItems;
    const lowerQuery = searchQuery.toLowerCase();
    return rawItems.filter(item => item.name.toLowerCase().includes(lowerQuery));
  }, [rawItems, searchQuery]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Stock Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <TableRow key={item.id} className={item.currentQuantity <= item.reorderLevel ? 'bg-destructive/5' : ''}>
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="text-xs uppercase font-semibold text-muted-foreground">{item.type}</TableCell>
                <TableCell className="text-right font-mono font-bold">
                    {item.currentQuantity.toLocaleString()}
                </TableCell>
                <TableCell>
                  {item.currentQuantity <= item.reorderLevel ? (
                    <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Optimal</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">Manage Stock</Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                <PackageSearch className="h-12 w-12 mx-auto opacity-20 mb-2" />
                <p>No inventory items found matching "{searchQuery}".</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
