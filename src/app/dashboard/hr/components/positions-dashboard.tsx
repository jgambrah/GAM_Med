
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

function CreateOrEditPositionDialog({ 
  position, 
  onSave,
  children
}: { 
  position?: Position | null, 
  onSave: (newPosition: Position) => void,
  children: React.ReactNode
}) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(position?.title || '');
  const [baseAnnualSalary, setBaseAnnualSalary] = React.useState(position?.baseAnnualSalary || 0);
  const isEditing = !!position;

  React.useEffect(() => {
    if (open) {
      if (isEditing && position) {
        setTitle(position.title);
        setBaseAnnualSalary(position.baseAnnualSalary);
      } else {
        setTitle('');
        setBaseAnnualSalary(0);
      }
    }
  }, [open, position, isEditing]);

  const handleSave = () => {
    if (!title.trim() || baseAnnualSalary <= 0) {
      toast.error('Title and a valid salary are required.');
      return;
    }

    const newPosition: Position = {
      positionId: isEditing ? position.positionId : `POS-${Date.now()}`,
      hospitalId: user?.hospitalId || '',
      title,
      baseAnnualSalary,
    };

    onSave(newPosition);
    toast.success(`Position "${title}" has been successfully ${isEditing ? 'updated' : 'created'}.`);

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Create New'} Position</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this position.' : 'Define a new job role and its associated base annual salary.'}
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
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApplySalaryIncreaseDialog({ positions, onIncreaseApplied }: { positions: Position[], onIncreaseApplied: (newPositions: Position[]) => void }) {
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
      
      toast.success(`All position base salaries have been increased by ${percentage}%.`);
  
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
  const { user } = useAuth();
  const [allPositions, setAllPositions] = useLocalStorage<Position[]>('positions', mockPositions);

  const hospitalPositions = React.useMemo(() => {
    if (!user) return [];
    return allPositions.filter(p => p.hospitalId === user.hospitalId);
  }, [allPositions, user]);

  const handleSave = (positionToSave: Position) => {
    setAllPositions(prev => {
        const exists = prev.some(p => p.positionId === positionToSave.positionId);
        if (exists) {
            return prev.map(p => p.positionId === positionToSave.positionId ? positionToSave : p);
        } else {
            return [...prev, positionToSave];
        }
    });
  };
  
  const handleIncreaseApplied = (updatedPositions: Position[]) => {
    // Only update the positions for the current hospital in the global list
    setAllPositions(prev => {
        const otherHospitalsPositions = prev.filter(p => p.hospitalId !== user?.hospitalId);
        return [...otherHospitalsPositions, ...updatedPositions];
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <CardTitle>Positions & Salary Grades</CardTitle>
          <CardDescription>
            Define job roles and their corresponding base annual salaries for your facility.
          </CardDescription>
        </div>
        <div className="flex gap-2">
            <ApplySalaryIncreaseDialog positions={hospitalPositions} onIncreaseApplied={handleIncreaseApplied} />
            <CreateOrEditPositionDialog onSave={handleSave}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Position
              </Button>
            </CreateOrEditPositionDialog>
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
              {hospitalPositions.length > 0 ? (
                hospitalPositions.map((position) => (
                    <TableRow key={position.positionId}>
                    <TableCell className="font-medium">{position.title}</TableCell>
                    <TableCell className="text-right font-mono">{position.baseAnnualSalary.toFixed(2)}</TableCell>
                    <TableCell>
                        <CreateOrEditPositionDialog position={position} onSave={handleSave}>
                        <Button variant="outline" size="sm">Edit</Button>
                        </CreateOrEditPositionDialog>
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No positions defined for your hospital.
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
