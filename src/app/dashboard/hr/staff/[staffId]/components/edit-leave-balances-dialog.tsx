
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
import { Edit } from 'lucide-react';

const LeaveBalanceSchema = z.object({
    'Annual Leave': z.coerce.number().min(0),
    'Sick Leave': z.coerce.number().min(0),
    'Specialist Leave': z.coerce.number().min(0),
});

interface EditLeaveBalancesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  balances: Record<string, number>;
  onSave: (newBalances: Record<string, number>) => void;
}

export function EditLeaveBalancesDialog({ isOpen, onOpenChange, balances, onSave }: EditLeaveBalancesDialogProps) {
  const form = useForm<z.infer<typeof LeaveBalanceSchema>>({
    resolver: zodResolver(LeaveBalanceSchema),
    defaultValues: {
        'Annual Leave': balances['Annual Leave'] || 0,
        'Sick Leave': balances['Sick Leave'] || 0,
        'Specialist Leave': balances['Specialist Leave'] || 0,
    }
  });

  React.useEffect(() => {
    if (isOpen) {
        form.reset({
            'Annual Leave': balances['Annual Leave'] || 0,
            'Sick Leave': balances['Sick Leave'] || 0,
            'Specialist Leave': balances['Specialist Leave'] || 0,
        });
    }
  }, [isOpen, balances, form]);

  const onSubmit = (values: z.infer<typeof LeaveBalanceSchema>) => {
    onSave(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Leave Balances</DialogTitle>
          <DialogDescription>
            Update the annual leave entitlements for this staff member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(form.getValues()).map((key) => (
                        <FormField
                            key={key}
                            control={form.control}
                            name={key as keyof z.infer<typeof LeaveBalanceSchema>}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{key}</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
