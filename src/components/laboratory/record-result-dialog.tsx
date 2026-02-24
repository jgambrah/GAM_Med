'use client';

import * as React from 'react';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { FileEdit, Loader2, Send } from 'lucide-react';

interface RecordResultDialogProps {
    order: any;
}

/**
 * == Laboratory Module: Result Recording Tool ==
 * 
 * This component handles the clinical sign-off for a lab test.
 * It ensures the results are "stamped" with the hospitalId to maintain the SaaS wall.
 */
export function RecordResultDialog({ order }: RecordResultDialogProps) {
    const { user } = useAuth();
    const db = useFirestore();
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!result.trim() || !user?.hospitalId) return;

        setLoading(true);
        try {
            // Reference the specific order document
            const orderRef = doc(db, 'lab_orders', order.id);
            
            /**
             * SAAS SECURITY PATTERN: Finalizing the record
             * We update the order status and include the mandatory hospitalId
             * to reaffirm the logical isolation of this clinical data.
             */
            await updateDoc(orderRef, {
                status: 'Completed',
                results: result,
                completedBy: user.name,
                completedById: user.uid,
                completedAt: serverTimestamp(),
                hospitalId: user.hospitalId // Affirming the tenant wall
            });

            // If a lab_results collection is used for EHR history, 
            // you would also create a document there here.

            toast.success("Lab result published to Patient EHR");
            setOpen(false);
            setResult(''); // Reset for next use
        } catch (error: any) {
            console.error("Result publication failed:", error);
            toast.error("Failed to publish result. Access Denied.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 gap-2">
                    <FileEdit className="h-4 w-4" />
                    Enter Results
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Lab Result Entry: {order.testName}</DialogTitle>
                    <DialogDescription>
                        Publish findings for {order.patientName}.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="bg-muted/30 p-3 rounded-lg text-sm border">
                        <p><strong>Patient:</strong> {order.patientName}</p>
                        <p><strong>MRN:</strong> {order.patientMrn || 'N/A'}</p>
                        <p className="mt-1"><strong>Indication:</strong> {order.notes || 'Routine diagnostic request'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="lab-findings">Findings / Clinical Values</Label>
                            <Textarea 
                                id="lab-findings"
                                placeholder="Enter lab values (e.g., Hemoglobin: 14.2 g/dL, WBC: 7.2 x 10^9/L)..." 
                                className="h-40 font-mono text-sm focus:bg-background transition-colors"
                                value={result}
                                onChange={(e) => setResult(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                className="bg-purple-600 hover:bg-purple-700 gap-2" 
                                disabled={loading || !result.trim()}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                {loading ? "Publishing..." : "Publish to EHR"}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
