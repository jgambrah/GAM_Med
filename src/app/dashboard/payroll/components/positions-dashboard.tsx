
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
import { mockPositions } from '@/lib/data';
import { Position } from '@/lib/types';
import { Plus, TrendingUp } from 'lucide-react';
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

function CreatePositionDialog({ onPositionCreated }: { onPositionCreated: (newPosition: Position) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [baseAnnualSalary, setBaseAnnualSalary] = React.useState(0);

  const handleCreate = () => {
    if (!title.trim() || baseAnnualSalary <= 0) {
      toast.error('Title and a valid salary are required.');
      return;
    }

    const newPosition: Position = {
      positionId: `POS-${Date.now()}`,
      title,
      baseAnnualSalary,
    };

    onPositionCreated(newPosition);
    toast.success('Position Created', {
      description: `Position "${title}" has been successfully created.`,
    });

    setOpen(false);
    setTitle('');
    setBaseAnnualSalary(0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Position
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Position</DialogTitle>
          <DialogDescription>
            Define a new job role and its associated base annual salary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="position-title">Position Title</Label>
            <Input
              id="position-title"
              placeholder="e.g., Senior Consultant Physician"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="base-salary">Base Annual Salary (₵)</Label>
            <Input
              id="base-salary"
              type="number"
              value={baseAnnualSalary}
              onChange={(e) => setBaseAnnualSalary(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Position</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplySalaryIncreaseDialog({ positions, onIncreaseApplied }: { positions: Position[], onIncreaseApplied: (newPositions: Position[]) => void }) {
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const [percentage, setPercentage] = React.useState(0);
  
    const handleApply = () => {
      if (percentage <= 0) {
        toast.error('Increase percentage must be greater than zero.');
        return;
      }
  
      const increaseFactor = 1 + (percentage / 100);
      const updatedPositions = positions.map(pos => ({
          ...pos,
          baseAnnualSalary: parseFloat((pos.baseAnnualSalary * increaseFactor).toFixed(2))
      }));
  
      onIncreaseApplied(updatedPositions);
      
      toast.success('Salaries Increased', {
        description: `All position base salaries have been increased by ${percentage}%.`,
      });
  
      setOpen(false);
      setPercentage(0);
    };
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Apply Salary Increase
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Global Salary Increase</DialogTitle>
            <DialogDescription>
              Increase the base salary for all positions by a set percentage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="increase-percentage">Increase Percentage (%)</Label>
              <Input
                id="increase-percentage"
                type="number"
                placeholder="e.g., 10"
                value={percentage}
                onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={percentage <= 0}>Apply Increase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

export function PositionsDashboard() {
  const [positions, setPositions] = React.useState<Position[]>(mockPositions);

  const handlePositionCreated = (newPosition: Position) => {
    setPositions(prev => [...prev, newPosition]);
  };
  
  const handleIncreaseApplied = (updatedPositions: Position[]) => {
    setPositions(updatedPositions);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <CardTitle>Positions & Salary Grades</CardTitle>
          <CardDescription>
            Define job roles and their corresponding base annual salaries.
          </CardDescription>
        </div>
        <div className="flex gap-2">
            <ApplySalaryIncreaseDialog positions={positions} onIncreaseApplied={handleIncreaseApplied} />
            <CreatePositionDialog onPositionCreated={handlePositionCreated} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position Title</TableHead>
                <TableHead className="text-right">Base Annual Salary (₵)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => (
                <TableRow key={position.positionId}>
                  <TableCell className="font-medium">{position.title}</TableCell>
                  <TableCell className="text-right font-mono">{position.baseAnnualSalary.toFixed(2)}</TableCell>
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
