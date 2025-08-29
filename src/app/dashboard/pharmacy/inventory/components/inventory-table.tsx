
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockInventory } from '@/lib/data';
import { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useDebouncedCallback } from 'use-debounce';

interface BatchDetailsDialogProps {
  item: InventoryItem;
  trigger: React.ReactNode;
}

function BatchDetailsDialog({ item, trigger }: BatchDetailsDialogProps) {
  const getExpiryColor = (dateString: string) => {
    const daysToExpiry = differenceInDays(parseISO(dateString), new Date());
    if (daysToExpiry < 0) return 'text-destructive font-semibold';
    if (daysToExpiry <= 30) return 'text-yellow-600 font-semibold';
    return '';
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Details: {item.name}</DialogTitle>
          <DialogDescription>
            A detailed breakdown of all available batches for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Date Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.batches && item.batches.length > 0 ? (
                item.batches
                  .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                  .map(batch => (
                    <TableRow key={batch.batchNumber}>
                      <TableCell>{batch.batchNumber}</TableCell>
                      <TableCell className="text-right font-mono">{batch.currentQuantity}</TableCell>
                      <TableCell className={cn(getExpiryColor(batch.expiryDate))}>
                        {format(parseISO(batch.expiryDate), 'PPP')}
                      </TableCell>
                      <TableCell>{format(parseISO(batch.dateReceived), 'PPP')}</TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No batches found for this item.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}


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

  const getRowClass = (totalQuantity: number, reorderLevel: number, nearestExpiry?: string) => {
    const isLowStock = totalQuantity <= reorderLevel;
    if (isLowStock) return 'bg-destructive/10 hover:bg-destructive/20';
    
    if (nearestExpiry) {
        const daysToExpiry = differenceInDays(parseISO(nearestExpiry), new Date());
        if (daysToExpiry <= 30 && daysToExpiry >= 0) return 'bg-yellow-400/10 hover:bg-yellow-400/20';
    }
    return '';
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Total Quantity</TableHead>
            <TableHead className="text-right">Reorder Level</TableHead>
            <TableHead>Nearest Expiry</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredItems.length > 0 ? (
            filteredItems.map(item => {
              const totalQuantity = item.batches?.reduce((sum, batch) => sum + batch.currentQuantity, 0) || 0;
              const nearestExpiryBatch = item.batches?.filter(b => new Date(b.expiryDate) > new Date()).sort((a,b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
              const nearestExpiry = nearestExpiryBatch?.expiryDate;

              const isLowStock = totalQuantity <= item.reorderLevel;
              const daysToExpiry = nearestExpiry ? differenceInDays(parseISO(nearestExpiry), new Date()) : Infinity;
              const isExpiringSoon = daysToExpiry <= 30 && daysToExpiry >=0;

              return (
                <TableRow key={item.itemId} className={cn(getRowClass(totalQuantity, item.reorderLevel, nearestExpiry))}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell className="text-right font-mono">{totalQuantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{item.reorderLevel.toLocaleString()}</TableCell>
                  <TableCell>
                    {nearestExpiry ? format(parseISO(nearestExpiry), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
                    {isExpiringSoon && <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">Expiring Soon</Badge>}
                    {!isLowStock && !isExpiringSoon && <Badge variant="secondary">In Stock</Badge>}
                  </TableCell>
                  <TableCell>
                     <BatchDetailsDialog 
                        item={item} 
                        trigger={<Button variant="outline" size="sm">View Batches</Button>} 
                     />
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
