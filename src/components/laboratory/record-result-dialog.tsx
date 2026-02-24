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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { FileEdit, Loader2, Send, Plus, Trash2, AlertCircle } from 'lucide-react';
import { LabParameter } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RecordResultDialogProps {
    order: any;
}

/**
 * == Laboratory Module: Formal Result Entry Tool ==
 * 
 * Allows technicians to enter structured lab parameters with reference ranges.
 * Stems data for professional statutory reporting.
 */
export function RecordResultDialog({ order }: RecordResultDialogProps) {
    const { user } = useAuth();
    const db = useFirestore();
    const [parameters, setParameters] = useState<LabParameter[]>([
        { name: '', value: '', unit: '', range: '', flag: 'Normal' }
    ]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const addParameter = () => {
        setParameters([...parameters, { name: '', value: '', unit: '', range: '', flag: 'Normal' }]);
    };

    const removeParameter = (index: number) => {
        setParameters(parameters.filter((_, i) => i !== index));
    };

    const updateParameter = (index: number, field: keyof LabParameter, value: string) => {
        const newParams = [...parameters];
        (newParams[index] as any)[field] = value;
        setParameters(newParams);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (parameters.some(p => !p.name || !p.value) || !user?.hospitalId) {
            toast.error("Please fill in all parameter names and values.");
            return;
        }

        setLoading(true);
        try {
            const orderRef = doc(db, 'lab_orders', order.id);
            
            await updateDoc(orderRef, {
                status: 'Completed',
                parameters: parameters,
                completedBy: user.name,
                completedById: user.uid,
                completedAt: serverTimestamp(),
                hospitalId: user.hospitalId
            });

            toast.success("Structured report published to EHR.");
            setOpen(false);
            setParameters([{ name: '', value: '', unit: '', range: '', flag: 'Normal' }]);
        } catch (error: any) {
            console.error("Publication failed:", error);
            toast.error("Failed to publish structured report.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 gap-2">
                    <FileEdit className="h-4 w-4" />
                    Record Results
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Structured Result Entry: {order.testName}</DialogTitle>
                    <DialogDescription>
                        Enter individual parameters and reference ranges for {order.patientName}.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                    <div className="bg-muted/30 p-3 rounded-lg text-sm border flex justify-between">
                        <div>
                            <p><strong>Patient:</strong> {order.patientName}</p>
                            <p><strong>MRN:</strong> {order.patientMrn || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p><strong>Ref:</strong> {order.id.slice(0,8)}</p>
                            <p className="text-[10px] uppercase font-bold text-purple-600">{order.testName}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Test Parameters</Label>
                            {parameters.map((param, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg bg-background shadow-sm">
                                    <div className="col-span-4 space-y-1">
                                        <Label className="text-[10px]">Parameter Name</Label>
                                        <Input 
                                            placeholder="e.g. Hemoglobin" 
                                            value={param.name} 
                                            onChange={(e) => updateParameter(index, 'name', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px]">Value</Label>
                                        <Input 
                                            placeholder="14.2" 
                                            value={param.value} 
                                            onChange={(e) => updateParameter(index, 'value', e.target.value)}
                                            className="h-8 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <Label className="text-[10px]">Unit</Label>
                                        <Input 
                                            placeholder="g/dL" 
                                            value={param.unit} 
                                            onChange={(e) => updateParameter(index, 'unit', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px]">Ref. Range</Label>
                                        <Input 
                                            placeholder="12-16" 
                                            value={param.range} 
                                            onChange={(e) => updateParameter(index, 'range', e.target.value)}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px]">Flag</Label>
                                        <Select value={param.flag} onValueChange={(v) => updateParameter(index, 'flag', v)}>
                                            <SelectTrigger className="h-8 text-[10px] font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Normal">Normal</SelectItem>
                                                <SelectItem value="Low">Low</SelectItem>
                                                <SelectItem value="High">High</SelectItem>
                                                <SelectItem value="Critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => removeParameter(index)}
                                            disabled={parameters.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button type="button" variant="outline" size="sm" onClick={addParameter} className="w-full border-dashed">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Parameter
                        </Button>
                        
                        <DialogFooter className="pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button 
                                type="submit" 
                                className="bg-purple-600 hover:bg-purple-700 gap-2 px-8" 
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Finalize Report
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
