
'use client';

import * as React from 'react';
import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileEdit, Loader2, Send } from 'lucide-react';

interface RecordResultDialogProps {
    order: any;
}

/**
 * == Laboratory Module: Result Recording ==
 * 
 * Allows technicians to input results for an order. 
 * Atomically updates the order status and publishes to the patient's EHR.
 */
export function RecordResultDialog({ order }: RecordResultDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const resultText = formData.get('result') as string;
            const now = new Date().toISOString();
            
            // 1. Update the worklist order status (Remove from queue)
            const orderRef = doc(firestore, 'lab_orders', order.id);
            updateDocumentNonBlocking(orderRef, {
                status: 'Completed',
                completedAt: now,
                resultSummary: resultText
            });

            // 2. Publish to EHR (Make available to clinical team)
            addDocumentNonBlocking(collection(firestore, 'lab_results'), {
                hospitalId: user?.hospitalId,
                patientId: order.patientId,
                patientName: order.patientName,
                testName: order.testName,
                orderId: order.id,
                status: 'Validated',
                resultText: resultText,
                orderedAt: order.createdAt,
                completedAt: now,
                recordedBy: user?.name,
                recordedById: user?.uid
            });

            toast.success(`Diagnostic results submitted for ${order.patientName}`);
            setOpen(false);
        } catch (error) {
            console.error("Lab submission error:", error);
            toast.error("Failed to process lab results. Access denied.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-purple-600 hover:bg-purple-700">
                    <FileEdit className="h-4 w-4" />
                    Enter Results
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Laboratory Results</DialogTitle>
                    <DialogDescription>
                        Record findings for <strong>{order.testName}</strong> ordered for {order.patientName}.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Findings / Result Summary</label>
                        <Textarea 
                            name="result" 
                            placeholder="e.g. Hemoglobin: 14.5 g/dL, WBC: 7.2 x 10^9/L. Morphology normal." 
                            required 
                            rows={8}
                            className="bg-muted/30 focus:bg-background transition-colors"
                        />
                    </div>
                    
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 gap-2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Validate & Finalize
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
