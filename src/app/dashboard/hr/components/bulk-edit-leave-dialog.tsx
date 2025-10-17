
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';
import { User } from '@/lib/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const BulkLeaveBalanceSchema = z.object({
    targetRole: z.string().min(1, { message: "You must select a target group."}),
    'Annual Leave': z.coerce.number().min(0),
    'Sick Leave': z.coerce.number().min(0),
    'Specialist Leave': z.coerce.number().min(0),
});

interface BulkEditLeaveDialogProps {
  roles: User['role'][];
  onSave: (targetRole: string, newBalances: Record<string, number>) => void;
}

export function BulkEditLeaveDialog({ roles, onSave }: BulkEditLeaveDialogProps) {
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof BulkLeaveBalanceSchema>>({
        resolver: zodResolver(BulkLeaveBalanceSchema),
        defaultValues: {
            targetRole: 'All Staff',
            'Annual Leave': 0,
            'Sick Leave': 0,
            'Specialist Leave': 0,
        }
    });

    const onSubmit = (values: z.infer<typeof BulkLeaveBalanceSchema>) => {
        const { targetRole, ...newBalances } = values;
        onSave(targetRole, newBalances);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Bulk Edit Leave
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bulk Edit Leave Balances</DialogTitle>
                    <DialogDescription>
                        Set the annual leave entitlements for a group of staff members. This will overwrite existing balances for the selected group.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                         <FormField
                            control={form.control}
                            name="targetRole"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Target Group</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="All Staff">All Staff</SelectItem>
                                            {roles.map(role => (
                                                <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <FormField
                                control={form.control}
                                name="Annual Leave"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Annual Leave</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="Sick Leave"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sick Leave</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="Specialist Leave"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Specialist Leave</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Apply Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

