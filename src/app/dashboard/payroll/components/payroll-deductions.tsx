
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
import { Plus } from 'lucide-react';
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
import { useLocalStorage } from '@/hooks/use-local-storage';

function CreateOrEditDeductionDialog({ 
  deduction, 
  onSave,
  children
}: { 
  deduction?: Deduction | null, 
  onSave: (newDeduction: Deduction) => void,
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const isEditing = !!deduction;

  React.useEffect(() => {
    if (open) {
      if (isEditing && deduction) {
        setName(deduction.name);
      } else {
        setName('');
      }
    }
  }, [open, deduction, isEditing]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Deduction name cannot be empty.');
      return;
    }

    const newDeduction: Deduction = {
      id: isEditing ? deduction.id : `DED-${Date.now()}`,
      name,
    };

    onSave(newDeduction);
    toast.success(`Deduction "${name}" has been successfully ${isEditing ? 'updated' : 'created'}.`);

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Create New'} Deduction</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the name for this deduction.' : 'Define a new non-statutory deduction that can be assigned to staff profiles.'}
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
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollDeductionsDashboard() {
  const [deductions, setDeductions] = useLocalStorage<Deduction[]>('deductions', mockDeductions);

  const handleSave = (deductionToSave: Deduction) => {
    const exists = deductions.some(d => d.id === deductionToSave.id);
    if (exists) {
      setDeductions(prev => prev.map(d => d.id === deductionToSave.id ? deductionToSave : d));
    } else {
      setDeductions(prev => [...prev, deductionToSave]);
    }
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
        <CreateOrEditDeductionDialog onSave={handleSave}>
            <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Deduction
            </Button>
        </CreateOrEditDeductionDialog>
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
                     <CreateOrEditDeductionDialog deduction={deduction} onSave={handleSave}>
                        <Button variant="outline" size="sm">Edit</Button>
                    </CreateOrEditDeductionDialog>
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
