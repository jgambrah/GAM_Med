'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from "@/hooks/use-toast";
import { Wind, Loader2 } from 'lucide-react';
import { updateOxygenLevel as updateOxygenLevelAction } from '@/lib/actions';

const OxygenLevelSchema = z.object({
    level: z.coerce.number().min(0, "Level cannot be negative").max(100, "Level cannot exceed 100%"),
});

interface UpdateOxygenLevelDialogProps {
    tank: {
        id: string;
        serialNumber: string;
        currentLevel?: number;
    };
}

export function UpdateOxygenLevelDialog({ tank }: UpdateOxygenLevelDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof OxygenLevelSchema>>({
        resolver: zodResolver(OxygenLevelSchema),
        defaultValues: {
            level: tank.currentLevel || 0,
        }
    });

    const onSubmit = async (values: z.infer<typeof OxygenLevelSchema>) => {
        if (!user || !firestore) return;

        try {
            const tankRef = doc(firestore, 'medical_equipment', tank.id);
            
            // 1. PERFORM UPDATE
            updateDocumentNonBlocking(tankRef, {
                oxygenLevel: values.level,
                updatedAt: serverTimestamp()
            });

            // 2. TRIGGER ALERT IF CRITICAL (Server Side Logic Simulation)
            if (values.level < 20) {
                const alertRef = collection(firestore, 'alerts');
                addDocumentNonBlocking(alertRef, {
                    hospitalId: user.hospitalId,
                    type: 'Resource',
                    alert_message: `CRITICAL: Oxygen Tank ${tank.serialNumber} is at ${values.level}%`,
                    severity: 'Critical',
                    isAcknowledged: false,
                    triggeredAt: new Date().toISOString()
                });
                toast.error("Critical Alert Triggered", { description: "Level below 20%. Nursing station notified." });
            } else {
                toast.success("Oxygen Level Updated");
            }

            setOpen(false);
        } catch (error) {
            toast.error("Update Failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black uppercase bg-blue-50 text-blue-700 hover:bg-blue-100">
                    Update Level
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <Wind className="h-5 w-5" />
                        <DialogTitle>Oxygen Check</DialogTitle>
                    </div>
                    <DialogDescription>
                        Record current pressure/level for tank <strong>{tank.serialNumber}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="level"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remaining Volume (%)</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-3">
                                            <Input type="number" {...field} className="text-2xl font-black h-14" />
                                            <span className="text-2xl font-bold text-muted-foreground">%</span>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Reading
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
