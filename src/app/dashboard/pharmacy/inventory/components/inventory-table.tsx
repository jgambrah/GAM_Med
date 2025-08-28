
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
import { mockInventory } from '@/lib/data';
import { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useDebouncedCallback } from 'use-debounce';

interface InventoryTableProps {
  searchQuery: string;
}

export function InventoryTable({ searchQuery }: InventoryTableProps) {
  const [filteredItems, setFilteredItems] = React.useState<InventoryItem[]>(mockInventory);

  const filterItems = useDebouncedCallback((query: string) => {
    if (!query) {
      setFilteredItems(mockInventory);
    } else {
      const lowercasedQuery = query.toLowerCase();
      const filtered = mockInventory.filter(item =>
        item.name.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredItems(filtered);
    }
  }, 200);

  React.useEffect(() => {
    filterItems(searchQuery);
  }, [searchQuery, filterItems]);


  const getRowClass = (item: InventoryItem) => {
    const isLowStock = item.currentQuantity <= item.reorderLevel;
    const daysToExpiry = differenceInDays(parseISO(item.expiryDate), new Date());
    const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry > 0;

    if (isLowStock) return 'bg-destructive/10 hover:bg-destructive/20';
    if (isExpiringSoon) return 'bg-yellow-400/10 hover:bg-yellow-400/20';
    return '';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Reorder Level</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length > 0 ? (
            filteredItems.map(item => {
              const isLowStock = item.currentQuantity <= item.reorderLevel;
              const isExpired = differenceInDays(parseISO(item.expiryDate), new Date()) < 0;
              const isExpiringSoon = differenceInDays(parseISO(item.expiryDate), new Date()) <= 30 && !isExpired;

              return (
                <TableRow key={item.itemId} className={cn(getRowClass(item))}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell className="text-right font-mono">{item.currentQuantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{item.reorderLevel.toLocaleString()}</TableCell>
                  <TableCell>{format(parseISO(item.expiryDate), 'PPP')}</TableCell>
                  <TableCell>
                    {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
                    {isExpiringSoon && <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Expiring Soon</Badge>}
                    {isExpired && <Badge variant="destructive">Expired</Badge>}
                    {!isLowStock && !isExpiringSoon && !isExpired && <Badge variant="secondary">In Stock</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">Details</Button>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No inventory items found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
