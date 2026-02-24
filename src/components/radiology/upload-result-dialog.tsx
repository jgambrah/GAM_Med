'use client';

import * as React from 'react';
import { useState } from 'react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
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
import { FileImage, Loader2, Send } from 'lucide-react';

interface UploadResultDialogProps {
    order: any;
}

/**
 * == Radiology Module: Result Entry & Imaging Tool ==
 * 
 * Clinical workbench for radiologists to upload scans and write reports.
 * Atomic writes update the order and "stamps" the report with the hospitalId.
 */
export function UploadResultDialog({ order }: UploadResultDialogProps) {
    const { user } = useAuth();
    const db = useFirestore();
    const [impression, setImpression] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!impression.trim() || !user?.hospitalId) return;

        setLoading(true);
        try {
            const orderRef = doc(db, 'radiology_orders', order.id);
            
            /**
             * SAAS SECURITY PATTERN: Report Finalization
             * We update the order status and embed mandatory SaaS tags.
             * This ensures logical isolation of imaging results.
             */
            updateDocumentNonBlocking(orderRef, {
                status: 'Completed',
                impression: impression,
                imageURL: 'https://picsum.photos/seed/scan/800/600', // Mock PACS storage link
                completedBy: user.name,
                completedById: user.uid,
                completedAt: serverTimestamp(),
                hospitalId: user.hospitalId // Reaffirming the wall
            });

            toast.success("Radiology report published to Patient EHR");
            setOpen(false);
            setImpression('');
        } catch (error: any) {
            console.error("Report submission failed:", error);
            toast.error("Failed to submit report. Access Denied.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700 gap-2">
                    <FileImage className="h-4 w-4" />
                    Enter Results
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Radiology Report: {order.modality}</DialogTitle>
                    <DialogDescription>
                        Finalize imaging findings for {order.patientName}.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="bg-orange-50/50 p-3 rounded-lg text-sm border border-orange-100">
                        <p><strong>Patient:</strong> {order.patientName}</p>
                        <p><strong>Indication:</strong> {order.indication || 'Routine imaging request'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="radiology-impression">Radiologist Impression</Label>
                            <Textarea 
                                id="radiology-impression"
                                placeholder="Enter formal diagnostic impression..." 
                                className="h-40 font-mono text-sm focus:bg-background transition-colors"
                                value={impression}
                                onChange={(e) => setImpression(e.target.value)}
                                required
                                disabled={loading}
                            />
                        </div>
                        
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                className="bg-orange-600 hover:bg-orange-700 gap-2" 
                                disabled={loading || !impression.trim()}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                {loading ? "Submitting..." : "Finalize & Publish"}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
