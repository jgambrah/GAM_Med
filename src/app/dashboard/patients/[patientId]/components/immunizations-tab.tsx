
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { ImmunizationRecord } from '@/lib/types';
import { mockImmunizationRecords, mockVaccineCatalog } from '@/lib/data';
import { Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LogImmunizationSchema } from '@/lib/schemas';
import { logImmunization } from '@/lib/actions';

interface LogImmunizationDialogProps {
  patientId: string;
}

function LogImmunizationDialog({ patientId }: LogImmunizationDialogProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof LogImmunizationSchema>>({
    resolver: zodResolver(LogImmunizationSchema),
    defaultValues: {
      vaccineId: '',
      doseNumber: 1,
      administeredAt: new Date().toISOString().split('T')[0], // Default to today
      notes: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof LogImmunizationSchema>) => {
    // In a real app, this would call the logImmunization Cloud Function.
    const result = await logImmunization(patientId, values);
    if (result.success) {
      alert('Immunization logged successfully (simulated).');
      setOpen(false);
      form.reset();
    } else {
      alert(`Error: ${result.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Shield className="mr-2 h-4 w-4" /> Log Immunization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log New Immunization</DialogTitle>
          <DialogDescription>
            Record a new vaccination administered to the patient.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vaccineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vaccine Name</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a vaccine" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockVaccineCatalog.map((vaccine) => (
                        <SelectItem key={vaccine.vaccineId} value={vaccine.vaccineId}>
                          {vaccine.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose Number</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="administeredAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Administered</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Administered in right deltoid" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Record'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface ImmunizationsTabProps {
  patientId: string;
}

export function ImmunizationsTab({ patientId }: ImmunizationsTabProps) {
  const { user } = useAuth();
  const canLog = user?.role === 'doctor' || user?.role === 'nurse';

  // In a real application, this data would come from a real-time listener
  // on the /patients/{patientId}/immunizations sub-collection.
  const immunizationHistory: ImmunizationRecord[] = mockImmunizationRecords.filter(
    (record) => record.patientId === patientId
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Immunization History</CardTitle>
          <CardDescription>
            A record of all vaccinations received by the patient.
          </CardDescription>
        </div>
        {canLog && <LogImmunizationDialog patientId={patientId} />}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaccine Name</TableHead>
                <TableHead>Dose #</TableHead>
                <TableHead>Date Administered</TableHead>
                <TableHead>Next Dose Due</TableHead>
                <TableHead>Administered By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {immunizationHistory.length > 0 ? (
                immunizationHistory.map((record) => (
                  <TableRow key={record.immunizationId}>
                    <TableCell className="font-medium">{record.vaccineName}</TableCell>
                    <TableCell>{record.doseNumber}</TableCell>
                    <TableCell>
                      {format(new Date(record.administeredAt), 'PPP')}
                    </TableCell>
                    <TableCell>
                      {record.nextDueDate ? format(new Date(record.nextDueDate), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {record.administeredByUserId === 'nurse1' ? 'F. Agyepong' : 'Staff'}
                    </TableCell>
                    <TableCell>{record.notes || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No immunization records found.
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
