

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
import { MoreHorizontal, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Prescription, InventoryItem } from '@/lib/types';
import { format, parseISO, isBefore } from 'date-fns';
import { mockPrescriptions, mockInventory } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DispenseDialogProps {
    prescription: Prescription;
    onDispense: () => void;
}

function DispenseDialog({ prescription, onDispense }: DispenseDialogProps) {
    const [open, setOpen] = React.useState(false);
    const [inventoryItem, setInventoryItem] = React.useState<InventoryItem | null>(null);
    const [dispensedQuantity, setDispensedQuantity] = React.useState(prescription.quantity);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            // Find the corresponding item in inventory based on medicationId
            const item = mockInventory.find(i => i.itemId === prescription.medicationId);
            setInventoryItem(item || null);
            setDispensedQuantity(prescription.quantity);
        }
    }, [open, prescription]);
    
    const isExpired = inventoryItem ? isBefore(parseISO(inventoryItem.expiryDate), new Date()) : false;
    const hasEnoughStock = inventoryItem ? inventoryItem.totalQuantity >= dispensedQuantity : false;
    const canDispense = !isExpired && hasEnoughStock && inventoryItem;


    const handleDispense = async () => {
        setIsSubmitting(true);
        // Simulate calling the dispenseMedication Cloud Function
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.success("Medication Dispensed", {
            description: `${dispensedQuantity} units of ${prescription.medicationName} dispensed to ${prescription.patientName}.`
        });

        // In a real app, the state would update via real-time listeners.
        // Here, we simulate it by triggering a re-render on the parent page.
        onDispense();
        
        setIsSubmitting(false);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                        <DialogTrigger className="w-full">Dispense Medication</DialogTrigger>
                    </DropdownMenuItem>
                    <DropdownMenuItem>View Full Prescription</DropdownMenuItem>
                    <DropdownMenuItem>Contact Prescriber</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dispense: {prescription.medicationName}</DialogTitle>
                    <DialogDescription>
                        Patient: {prescription.patientName} | Prescribed by: {prescription.prescribedByDoctorName}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Prescribed Quantity</Label>
                            <Input value={prescription.quantity} readOnly disabled />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="dispensed-qty">Dispensed Quantity</Label>
                            <Input 
                                id="dispensed-qty"
                                type="number"
                                value={dispensedQuantity}
                                onChange={(e) => setDispensedQuantity(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                        <h4 className="font-semibold">Inventory Check</h4>
                        {inventoryItem ? (
                            <>
                               <div className={cn("flex items-center", hasEnoughStock ? 'text-green-600' : 'text-destructive')}>
                                   <AlertCircle className="h-4 w-4 mr-2" />
                                   <span>In Stock: {inventoryItem.totalQuantity} units</span>
                               </div>
                                <div className={cn("flex items-center", isExpired ? 'text-destructive' : 'text-green-600')}>
                                   <AlertCircle className="h-4 w-4 mr-2" />
                                   <span>Expiry Date: {format(parseISO(inventoryItem.expiryDate), 'PPP')}</span>
                               </div>
                            </>
                        ) : (
                            <div className="text-destructive flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <span>Item not found in inventory.</span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleDispense} disabled={!canDispense || isSubmitting}>
                        {isSubmitting ? 'Dispensing...' : 'Confirm & Dispense'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const getStatusVariant = (status: Prescription['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'Pending Pharmacy': return 'default';
        case 'Dispensed': return 'secondary';
        case 'Canceled': return 'destructive';
        default: return 'outline';
    }
};

export function PharmacyWorkQueue({ onDispense }: { onDispense: () => void }) {
  const { user } = useAuth();
  // In a real app, this would be a real-time Firestore query on the top-level 'prescriptions' collection
  // where status is 'Pending Pharmacy' or similar.
  const pendingPrescriptions = mockPrescriptions.filter(p => p.status === 'Pending Pharmacy');

  const isPharmacist = user?.role === 'pharmacist';

  if (!user || (user.role !== 'pharmacist' && user.role !== 'doctor' && user.role !== 'admin')) {
      return (
          <div className="text-center text-muted-foreground p-8">
              This work queue is only available to authorized clinical and administrative staff.
          </div>
      );
  }

  return (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Prescribed At</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Prescribing Doctor</TableHead>
                <TableHead>Status</TableHead>
                {isPharmacist && (
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                )}
            </TableRow>
            </TableHeader>
            <TableBody>
            {pendingPrescriptions.length > 0 ? (
                pendingPrescriptions.map((prescription) => (
                <TableRow key={prescription.prescriptionId}>
                    <TableCell className="font-medium">
                        {format(new Date(prescription.prescribedAt), 'PPP p')}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${prescription.patientId}`} className="hover:underline text-primary">
                            {prescription.patientName}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <div>{prescription.medicationName}</div>
                        <div className="text-sm text-muted-foreground">{prescription.dosage} / {prescription.frequency}</div>
                    </TableCell>
                    <TableCell>{prescription.prescribedByDoctorName}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(prescription.status)}>{prescription.status}</Badge>
                    </TableCell>
                    {isPharmacist && (
                        <TableCell>
                            <DispenseDialog prescription={prescription} onDispense={onDispense} />
                        </TableCell>
                    )}
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={isPharmacist ? 6 : 5} className="h-24 text-center">
                    No pending prescriptions in the queue.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  );
}
