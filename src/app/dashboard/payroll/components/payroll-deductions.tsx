
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { mockDeductions } from '@/lib/data';
import { Deduction } from '@/lib/types';
import { Plus, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function CreateDeductionDialog({ onDeductionCreated }: { onDeductionCreated: (newDeduction: Deduction) => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Deduction name cannot be empty.');
      return;
    }

    const newDeduction: Deduction = {
      id: `DED-${Date.now()}`,
      name,
    };

    // In a real app, this would call a server action.
    onDeductionCreated(newDeduction);
    toast.success('Deduction Created', {
      description: `Deduction type "${name}" has been successfully created.`,
    });

    setOpen(false);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Deduction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Deduction Type</DialogTitle>
          <DialogDescription>
            Define a new non-statutory deduction that can be assigned to staff profiles.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deduction-name">Deduction Name</Label>
            <Input
              id="deduction-name"
              placeholder="e.g., Staff Welfare, Staff Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Deduction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollDeductionsDashboard() {
  const [deductions, setDeductions] = React.useState<Deduction[]>(mockDeductions);

  const handleDeductionCreated = (newDeduction: Deduction) => {
    setDeductions(prev => [...prev, newDeduction]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Non-Statutory Deductions</CardTitle>
          <CardDescription>
            Define standard non-statutory deductions that can be applied to staff salaries.
          </CardDescription>
        </div>
        <CreateDeductionDialog onDeductionCreated={handleDeductionCreated} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deduction Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deductions.map((deduction) => (
                <TableRow key={deduction.id}>
                  <TableCell className="font-medium">{deduction.name}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" disabled>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
