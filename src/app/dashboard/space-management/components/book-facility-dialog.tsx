
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { CalendarCheck, Loader2 } from 'lucide-react';
import { Facility } from '@/lib/types';
import { NewFacilityBookingSchema } from '@/lib/schemas';

interface BookFacilityDialogProps {
    facilities: Facility[];
}

/**
 * == Space & Facility Management: Resource Booking Tool ==
 * 
 * Allows staff to reserve hospital real estate (Seminar Halls, Consultation Rooms).
 * Every booking drives the real-time utilization analytics for the Director.
 */
export function BookFacilityDialog({ facilities }: BookFacilityDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof NewFacilityBookingSchema>>({
        resolver: zodResolver(NewFacilityBookingSchema),
        defaultValues: {
            hospitalId: user?.hospitalId || '',
            facilityId: '',
            startTime: '',
            endTime: '',
            purpose: '',
        },
    });

    React.useEffect(() => {
        if (open && user) {
            form.setValue('hospitalId', user.hospitalId);
        }
    }, [open, user, form]);

    const onSubmit = async (values: z.infer<typeof NewFacilityBookingSchema>) => {
        if (!user || !firestore) return;

        const start = new Date(values.startTime);
        const end = new Date(values.endTime);
        const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (durationHours <= 0) {
            toast.error("Invalid Time Range", { description: "End time must be after start time." });
            return;
        }

        const bookingData = {
            ...values,
            userId: user.uid,
            userName: user.name,
            duration: durationHours,
            status: 'Confirmed',
            createdAt: serverTimestamp()
        };

        try {
            // SAAS isolation enforced via hospitalId in the payload
            addDocumentNonBlocking(collection(firestore, "facility_bookings"), bookingData);
            
            toast.success("Facility Reserved", {
                description: `Room booked successfully for ${values.purpose}.`
            });
            
            setOpen(false);
            form.reset();
        } catch (error) {
            toast.error("Booking Failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md">
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    Book Facility
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-blue-600">
                        <CalendarCheck className="h-5 w-5" />
                        <DialogTitle>Reserve Unit / Room</DialogTitle>
                    </div>
                    <DialogDescription>
                        Schedule usage for a physical asset at <strong>{user?.hospitalId}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="facilityId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Target Unit</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select room..." /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {facilities.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.name} ({f.type})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase">From</FormLabel>
                                        <FormControl><Input type="datetime-local" {...field} className="bg-muted/30" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="endTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold uppercase">Until</FormLabel>
                                        <FormControl><Input type="datetime-local" {...field} className="bg-muted/30" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="purpose"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Booking Reason</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Departmental Seminar, VIP Consult" {...field} className="bg-muted/30" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700 font-bold">
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Confirm Booking
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
