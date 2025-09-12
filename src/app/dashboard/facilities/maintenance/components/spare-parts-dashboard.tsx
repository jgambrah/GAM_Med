
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
import { mockSpareParts } from '@/lib/data';
import { SparePart } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { SparePartsLogDialog } from './spare-parts-log-dialog';

export function SparePartsDashboard() {
  const [items, setItems] = React.useState<SparePart[]>(mockSpareParts);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedPart, setSelectedPart] = React.useState<SparePart | null>(null);

  const filterItems = useDebouncedCallback((query: string) => {
    if (!query) {
      setItems(mockSpareParts);
    } else {
      const lowercasedQuery = query.toLowerCase();
      const filtered = mockSpareParts.filter(item =>
        item.name.toLowerCase().includes(lowercasedQuery) ||
        item.partNumber.toLowerCase().includes(lowercasedQuery) ||
        item.partId.toLowerCase().includes(lowercasedQuery)
      );
      setItems(filtered);
    }
  }, 300);

  React.useEffect(() => {
    filterItems(searchQuery);
  }, [searchQuery, filterItems]);
  
  const getRowClass = (item: SparePart) => {
    if (item.currentQuantity <= 0) return 'bg-destructive/20 hover:bg-destructive/30';
    if (item.currentQuantity <= item.reorderLevel) return 'bg-yellow-500/20 hover:bg-yellow-500/30';
    return '';
  };
  
  return (
    <>
    <div className="space-y-4">
       <div className="flex justify-end">
            <Input
                placeholder="Search by name, ID, or part number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
        </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part Name</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Reorder Level</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.partId} className={cn(getRowClass(item))}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="font-mono text-xs">{item.partNumber}</TableCell>
                <TableCell className="text-right font-mono">{item.currentQuantity}</TableCell>
                <TableCell className="text-right font-mono">{item.reorderLevel}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPart(item)}>
                    View Log
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
    {selectedPart && (
      <SparePartsLogDialog
        part={selectedPart}
        isOpen={!!selectedPart}
        onOpenChange={(isOpen) => !isOpen && setSelectedPart(null)}
      />
    )}
    </>
  );
}
