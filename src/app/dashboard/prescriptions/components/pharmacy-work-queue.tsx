
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
import { MoreHorizontal, AlertCircle, AlertTriangle } from 'lucide-react';
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
import { mockPrescriptions, mockInventory, allPatients, allUsers } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateInventory, checkPrescriptionSafety } from '@/lib/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

interface DispenseDialogProps {
    prescription: Prescription;
    onDispense: () => void;
}

interface Alert {
    type: 'Allergy' | 'Interaction';
    severity: 'High' | 'Moderate' | 'Low';
    message: string;
}

function DispenseDialog({ prescription, onDispense }: DispenseDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const [inventoryItem, setInventoryItem] = React.useState<InventoryItem | null>(null);
    const [dispensedQuantity, setDispensedQuantity] = React.useState(0);
    const [selectedBatchNumber, setSelectedBatchNumber] = React.useState<string | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // New state for safety checks
    const [isChecking, setIsChecking] = React.useState(true);
    const [alerts, setAlerts] = React.useState<Alert[]>([]);
    const [isAcknowledged, setIsAcknowledged] = React.useState(false);

    const medication = prescription.medications[0];

    const usableBatches = React.useMemo(() => {
        if (!inventoryItem || !inventoryItem.batches) return [];
        const now = new Date();
        return inventoryItem.batches
            .filter(b => b.currentQuantity > 0 && isBefore(now, parseISO(b.expiryDate)))
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    }, [inventoryItem]);

    React.useEffect(() => {
        const performSafetyChecks = async () => {
            if (!open) return;

            setIsChecking(true);
            setAlerts([]);
            setIsAcknowledged(false); // Reset acknowledgment on open
            
            const result = await checkPrescriptionSafety(prescription.patientId, medication.name);
            if (result.success && result.alerts) {
                setAlerts(result.alerts);
            }
            setIsChecking(false);
        };
        
        if (open) {
            const item = mockInventory.find(i => i.name.toLowerCase().includes(prescription.medications[0].name.toLowerCase()));
            setInventoryItem(item || null);
            setDispensedQuantity(prescription.medications[0].quantity_to_dispense);

            if (item && item.batches) {
                const now = new Date();
                const firstUsableBatch = item.batches
                    .filter(b => b.currentQuantity > 0 && isBefore(now, parseISO(b.expiryDate)))
                    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
                
                if (firstUsableBatch) {
                    setSelectedBatchNumber(firstUsableBatch.batchNumber);
                }
            }
            performSafetyChecks();
        } else {
            setInventoryItem(null);
            setSelectedBatchNumber(undefined);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, prescription]);
    
    const selectedBatch = usableBatches.find(b => b.batchNumber === selectedBatchNumber);
    const hasEnoughStock = selectedBatch ? selectedBatch.currentQuantity >= dispensedQuantity : false;
    const canDispense = !!selectedBatch && hasEnoughStock && !isChecking && (alerts.length === 0 || isAcknowledged);


    const handleDispense = async () => {
        if (!user || !inventoryItem || !selectedBatch) return;

        setIsSubmitting(true);
        
        await updateInventory({
            itemId: inventoryItem.itemId,
            quantityChange: -dispensedQuantity,
            type: 'Dispense',
            userId: user.uid,
            reason: `Prescription #${prescription.prescriptionId}`,
            batchNumber: selectedBatch.batchNumber,
        });
        
        toast.success("Medication Dispensed", {
            description: `${dispensedQuantity} units of ${prescription.medications[0].name} from batch ${selectedBatch.batchNumber} dispensed. Inventory updated.`
        });

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
                    <DialogTitle>Dispense: {prescription.medications[0].name}</DialogTitle>
                    <DialogDescription>
                        Patient: {prescription.patientName} | Prescribed by: Dr. Evelyn Mensah
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {isChecking ? (
                         <div className="space-y-2">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : alerts.length > 0 && (
                        <div className="p-4 bg-destructive/10 border-l-4 border-destructive rounded-md space-y-3">
                            <div className="flex items-start">
                                <AlertTriangle className="h-6 w-6 text-destructive mr-3 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-destructive">Patient Safety Alert</h3>
                                    <p className="text-sm text-destructive/80">
                                        The following issues were found. Please review before proceeding.
                                    </p>
                                </div>
                            </div>
                            <ul className="list-disc pl-8 space-y-1 text-sm">
                                {alerts.map((alert, index) => (
                                    <li key={index}><strong>{alert.type} Alert ({alert.severity}):</strong> {alert.message}</li>
                                ))}
                            </ul>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="acknowledge" checked={isAcknowledged} onCheckedChange={(checked) => setIsAcknowledged(checked === true)} />
                                <label htmlFor="acknowledge" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    I acknowledge these warnings and wish to proceed.
                                </label>
                            </div>
                        </div>
                    )}

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Prescribed Quantity</Label>
                            <Input value={prescription.medications[0].quantity_to_dispense} readOnly disabled />
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
                     <div className="space-y-2">
                        <Label>Select Batch (FEFO default)</Label>
                        <Select value={selectedBatchNumber} onValueChange={setSelectedBatchNumber}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a batch..." />
                            </SelectTrigger>
                            <SelectContent>
                                {usableBatches.length > 0 ? (
                                    usableBatches.map(batch => (
                                        <SelectItem key={batch.batchNumber} value={batch.batchNumber}>
                                            Batch: {batch.batchNumber} (Expires: {format(parseISO(batch.expiryDate), 'PPP')}, Stock: {batch.currentQuantity})
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="none" disabled>No usable batches available</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                     </div>


                    <div className="p-4 border rounded-md bg-muted/50 space-y-2">
                        <h4 className="font-semibold">Inventory Check</h4>
                        {selectedBatch ? (
                            <>
                               <div className={cn("flex items-center", hasEnoughStock ? 'text-green-600' : 'text-destructive')}>
                                   <AlertCircle className="h-4 w-4 mr-2" />
                                   <span>In Stock: {selectedBatch.currentQuantity} units</span>
                               </div>
                                <div className="text-green-600 flex items-center">
                                   <AlertCircle className="h-4 w-4 mr-2" />
                                   <span>Expiry Date: {format(parseISO(selectedBatch.expiryDate), 'PPP')}</span>
                               </div>
                            </>
                        ) : (
                            <div className="text-destructive flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <span>Item not found or no usable stock available.</span>
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
        case 'Pending': return 'default';
        case 'Dispensed': return 'secondary';
        case 'Canceled': return 'destructive';
        default: return 'outline';
    }
};

export function PharmacyWorkQueue({ onDispense }: { onDispense: () => void }) {
  const { user } = useAuth();
  // In a real app, this would be a real-time Firestore query on the top-level 'prescriptions' collection
  // where status is 'Pending Pharmacy' or similar.
  const pendingPrescriptions = mockPrescriptions.filter(p => p.status === 'Pending');

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
                        {format(new Date(prescription.datePrescribed), 'PPP p')}
                    </TableCell>
                    <TableCell>
                        <Link href={`/dashboard/patients/${prescription.patientId}`} className="hover:underline text-primary">
                            {allPatients.find(p => p.patient_id === prescription.patientId)?.full_name || 'Unknown Patient'}
                        </Link>
                    </TableCell>
                    <TableCell>
                        <div>{prescription.medications[0].name}</div>
                        <div className="text-sm text-muted-foreground">{prescription.medications[0].dosage} / {prescription.medications[0].frequency}</div>
                    </TableCell>
                    <TableCell>{allUsers.find(u => u.uid === prescription.doctorId)?.name || 'Unknown Doctor'}</TableCell>
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
