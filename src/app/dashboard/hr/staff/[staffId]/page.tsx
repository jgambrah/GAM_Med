

'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { mockStaffProfiles, mockAllowances, mockDeductions, mockPositions, mockPayrollRuns, mockPayrollRecords } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Plus, Trash2, Download } from 'lucide-react';
import { StaffProfile, PayrollRecord } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

const ItemSchema = z.object({
  name: z.string().min(1, 'You must select an item.'),
  amount: z.coerce.number().min(1, 'Amount must be greater than zero.'),
});

function AddRecurringItemDialog({ staff, itemType, onAdded }: { staff: StaffProfile, itemType: 'Allowance' | 'Deduction', onAdded: (name: string, amount: number) => void }) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof ItemSchema>>({
    resolver: zodResolver(ItemSchema),
    defaultValues: { name: '', amount: 0 },
  });

  const availableItems = itemType === 'Allowance' ? mockAllowances : mockDeductions;

  const onSubmit = (values: z.infer<typeof ItemSchema>) => {
    // In a real app, this would call a server action
    onAdded(values.name, values.amount);
    toast.success(`${itemType} Added`, { description: `${values.name} has been added to ${staff.firstName}'s profile.` });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add {itemType}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Recurring {itemType}</DialogTitle>
          <DialogDescription>
            Add a new recurring {itemType.toLowerCase()} to {staff.firstName} {staff.lastName}'s profile.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{itemType} Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select a ${itemType.toLowerCase()} type`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableItems.map(a => (
                        <SelectItem key={itemType === 'Allowance' ? a.allowanceId : a.id} value={a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Amount (₵)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Add {itemType}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PayrollHistoryTab({ staffId }: { staffId: string }) {
    // In a real app, this would be a Firestore query across all payroll runs for this staffId.
    const staffPayslips = mockPayrollRecords
      .filter(p => p.staffId === staffId)
      .map(p => {
          const run = mockPayrollRuns.find(r => r.runId === p.recordId.split('-')[1]);
          return { ...p, payPeriod: run?.payPeriod || 'N/A' };
      });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payslip History</CardTitle>
                <CardDescription>A record of all generated payslips for this staff member.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pay Period</TableHead>
                                <TableHead className="text-right">Gross Pay (₵)</TableHead>
                                <TableHead className="text-right">Net Pay (₵)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffPayslips.length > 0 ? (
                                staffPayslips.map((slip) => (
                                    <TableRow key={slip.recordId}>
                                        <TableCell className="font-medium">{slip.payPeriod}</TableCell>
                                        <TableCell className="text-right font-mono">{slip.grossPay.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-bold">{slip.netPay.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="link">
                                                <a href={slip.payslipUrl} target="_blank" rel="noopener noreferrer">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download Payslip
                                                </a>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No payroll history found for this staff member.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.staffId as string;
  const { toast } = useToast();

  const [staff, setStaff] = React.useState<StaffProfile | undefined>(
    mockStaffProfiles.find((p) => p.staffId === staffId)
  );

  const staffPosition = mockPositions.find(p => p.positionId === staff?.positionId);

  if (!staff) {
    notFound();
  }

  const handleAddAllowance = (name: string, amount: number) => {
    setStaff(prev => {
      if (!prev) return prev;
      const newAllowances = [...(prev.recurringAllowances || []), { name, amount }];
      return { ...prev, recurringAllowances: newAllowances };
    });
  };

  const handleRemoveAllowance = (allowanceName: string) => {
    setStaff(prev => {
       if (!prev) return prev;
       const newAllowances = prev.recurringAllowances.filter(a => a.name !== allowanceName);
       return { ...prev, recurringAllowances: newAllowances };
    });
    toast.error('Allowance Removed', { description: `${allowanceName} has been removed.` });
  };
  
  const handleAddDeduction = (name: string, amount: number) => {
    setStaff(prev => {
      if (!prev) return prev;
      const newDeductions = [...(prev.recurringDeductions || []), { name, amount }];
      return { ...prev, recurringDeductions: newDeductions };
    });
  };
  
  const handleRemoveDeduction = (deductionName: string) => {
    setStaff(prev => {
       if (!prev) return prev;
       const newDeductions = prev.recurringDeductions.filter(a => a.name !== deductionName);
       return { ...prev, recurringDeductions: newDeductions };
    });
    toast.error('Deduction Removed', { description: `${deductionName} has been removed.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{`${staff.firstName} ${staff.lastName}`}</h1>
          <p className="text-muted-foreground">
            {staffPosition?.title || 'No Position Assigned'} - {staff.employeeId}
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="salary">
        <TabsList>
            <TabsTrigger value="salary">Salary & Deductions</TabsTrigger>
            <TabsTrigger value="payroll">Payroll History</TabsTrigger>
        </TabsList>
        <TabsContent value="salary" className="mt-4">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Salary & Allowances</CardTitle>
                        <CardDescription>Manage recurring payments and benefits.</CardDescription>
                    </div>
                    <AddRecurringItemDialog staff={staff} itemType="Allowance" onAdded={handleAddAllowance} />
                    </CardHeader>
                    <CardContent>
                    <div className="rounded-md border">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Monthly Amount (₵)</TableHead>
                            <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="font-semibold bg-muted/50">
                            <TableCell>Base Salary ({staffPosition?.title || 'N/A'})</TableCell>
                            <TableCell className="text-right">
                                {((staffPosition?.baseAnnualSalary || 0) / 12).toFixed(2)}
                            </TableCell>
                            <TableCell></TableCell>
                            </TableRow>
                            {staff.recurringAllowances.map((allowance) => (
                            <TableRow key={allowance.name}>
                                <TableCell>{allowance.name}</TableCell>
                                <TableCell className="text-right">{allowance.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRemoveAllowance(allowance.name)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Recurring Deductions</CardTitle>
                        <CardDescription>Manage recurring deductions from salary.</CardDescription>
                    </div>
                    <AddRecurringItemDialog staff={staff} itemType="Deduction" onAdded={handleAddDeduction} />
                    </CardHeader>
                    <CardContent>
                    <div className="rounded-md border">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Monthly Amount (₵)</TableHead>
                            <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.recurringDeductions.map((deduction) => (
                            <TableRow key={deduction.name}>
                                <TableCell>{deduction.name}</TableCell>
                                <TableCell className="text-right">{deduction.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRemoveDeduction(deduction.name)}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="payroll" className="mt-4">
            <PayrollHistoryTab staffId={staff.staffId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
