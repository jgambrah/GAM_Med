
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
import { useToast } from '@/hooks/use-toast';
import { mockAllowances } from '@/lib/data';
import { Allowance } from '@/lib/types';
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
import { Checkbox } from '@/components/ui/checkbox';

function CreateAllowanceDialog({ onAllowanceCreated }: { onAllowanceCreated: (newAllowance: Allowance) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [isTaxable, setIsTaxable] = React.useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Allowance name cannot be empty.');
      return;
    }

    const newAllowance: Allowance = {
      allowanceId: `ALW-${Date.now()}`,
      name,
      isTaxable,
    };

    // In a real app, this would call a server action.
    onAllowanceCreated(newAllowance);
    toast.success('Allowance Created', {
      description: `Allowance "${name}" has been successfully created.`,
    });

    setOpen(false);
    setName('');
    setIsTaxable(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Allowance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Allowance</DialogTitle>
          <DialogDescription>
            Define a new allowance that can be assigned to staff profiles.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="allowance-name">Allowance Name</Label>
            <Input
              id="allowance-name"
              placeholder="e.g., Rent Allowance, Transport Allowance"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-taxable"
              checked={isTaxable}
              onCheckedChange={(checked) => setIsTaxable(checked === true)}
            />
            <Label htmlFor="is-taxable">This allowance is taxable</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Allowance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollAllowancesDashboard() {
  const [allowances, setAllowances] = React.useState<Allowance[]>(mockAllowances);

  const handleAllowanceCreated = (newAllowance: Allowance) => {
    setAllowances(prev => [...prev, newAllowance]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Allowance Configuration</CardTitle>
          <CardDescription>
            Define standard allowances that can be applied to staff salaries.
          </CardDescription>
        </div>
        <CreateAllowanceDialog onAllowanceCreated={handleAllowanceCreated} />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Allowance Name</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowances.map((allowance) => (
                <TableRow key={allowance.allowanceId}>
                  <TableCell className="font-medium">{allowance.name}</TableCell>
                  <TableCell>
                    {allowance.isTaxable ? (
                      <span className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" /> Yes
                      </span>
                    ) : (
                      <span className="flex items-center text-muted-foreground">
                        <XCircle className="h-4 w-4 mr-2" /> No
                      </span>
                    )}
                  </TableCell>
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
