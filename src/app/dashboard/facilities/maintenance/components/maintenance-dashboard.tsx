
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { mockWorkOrders, allUsers, mockResources, mockSpareParts } from '@/lib/data';
import { User, WorkOrder, SparePart } from '@/lib/types';
import { format } from 'date-fns';
import { Wrench, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { AddMaintenanceRequestDialog } from '@/app/dashboard/admin/resources/components/add-maintenance-request-dialog';
import { cn } from '@/lib/utils';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';


const getPriorityVariant = (priority: WorkOrder['priority']): 'destructive' | 'default' | 'secondary' => {
  switch (priority) {
    case 'High': return 'destructive';
    case 'Medium': return 'default';
    default: return 'secondary';
  }
};

const getStatusVariant = (status: WorkOrder['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch(status) {
        case 'Open': return 'destructive';
        case 'Assigned': return 'default';
        case 'In Progress': return 'outline';
        case 'Resolved': return 'secondary';
        case 'Closed': return 'secondary';
        default: return 'outline';
    }
}

const ResolveRequestSchema = z.object({
  resolutionNotes: z.string().min(10, 'Resolution notes must be at least 10 characters.'),
  partsUsed: z.array(z.object({
      partId: z.string().min(1, 'Part is required'),
      quantityUsed: z.coerce.number().min(1, 'Quantity must be at least 1'),
  })).optional(),
});


function ResolveRequestDialog({ request, onAction }: { request: WorkOrder, onAction: () => void }) {
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof ResolveRequestSchema>>({
        resolver: zodResolver(ResolveRequestSchema),
        defaultValues: {
            resolutionNotes: '',
            partsUsed: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "partsUsed"
    });

    const sparePartOptions = mockSpareParts.map(p => ({
        label: `${p.name} (${p.partNumber}) - Stock: ${p.currentQuantity}`,
        value: p.partId
    }));

    const handleResolve = (values: z.infer<typeof ResolveRequestSchema>) => {
        // In a real app, this would call the resolveWorkOrder Cloud Function
        console.log(`Resolving request ${request.workOrderId} with data:`, values);
        toast.success("Request Resolved", {
            description: "The maintenance request has been marked as resolved."
        });
        onAction();
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={request.status === 'Resolved' || request.status === 'Closed'}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Resolve
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Resolve Work Order</DialogTitle>
                    <DialogDescription>
                        Add completion notes and log any spare parts used for this request.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleResolve)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="resolutionNotes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Resolution Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., Replaced faulty compressor. System now operational."
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div>
                            <FormLabel>Parts Used (Optional)</FormLabel>
                            <div className="space-y-2 mt-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                                        <FormField
                                            control={form.control}
                                            name={`partsUsed.${index}.partId`}
                                            render={({ field }) => (
                                                <FormItem className="flex-grow">
                                                     <Combobox
                                                        options={sparePartOptions}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        placeholder="Search spare parts..."
                                                        searchPlaceholder="Search parts..."
                                                        notFoundText="No part found."
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`partsUsed.${index}.quantityUsed`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input type="number" className="w-24" placeholder="Qty Used" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                 <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => append({ partId: '', quantityUsed: 1 })}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Add Part
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Confirm Resolution</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AssignTechnicianDialog({ workOrder, onAssigned }: { workOrder: WorkOrder, onAssigned: () => void }) {
    const [open, setOpen] = React.useState(false);
    const [selectedTech, setSelectedTech] = React.useState('');
    const technicians = allUsers.filter(u => u.role === 'admin'); // Assuming admins are technicians for now

    const handleAssign = () => {
        if (!selectedTech) {
            toast.error('Please select a technician to assign.');
            return;
        }
        // In a real app, this would call the `assignWorkOrder` Cloud Function
        console.log(`Assigning work order ${workOrder.workOrderId} to technician ${selectedTech}`);
        toast.success(`Work order assigned to ${technicians.find(t => t.uid === selectedTech)?.name}.`);
        onAssigned();
        setOpen(false);
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={workOrder.status !== 'Open'}>
                    Assign
                </Button>
            </DialogTrigger>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Assign Work Order</DialogTitle>
                    <DialogDescription>
                        Assign this work order to an available technician.
                    </DialogDescription>
                </DialogHeader>
                 <div className="py-4">
                    <Select onValueChange={setSelectedTech}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a technician..." />
                        </SelectTrigger>
                        <SelectContent>
                            {technicians.map(tech => (
                                <SelectItem key={tech.uid} value={tech.uid}>{tech.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleAssign} disabled={!selectedTech}>Confirm Assignment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export function MaintenanceDashboard() {
  const [requests, setRequests] = React.useState<WorkOrder[]>(mockWorkOrders);
  const [priorityFilter, setPriorityFilter] = React.useState('All');
  const [statusFilter, setStatusFilter] = React.useState('Open');

  const filterAndSortRequests = React.useCallback(() => {
    let filteredList = mockWorkOrders;

    if (priorityFilter !== 'All') {
      filteredList = filteredList.filter(item => item.priority === priorityFilter);
    }
    if (statusFilter !== 'All') {
      filteredList = filteredList.filter(item => item.status === statusFilter);
    }
    
    // Sort to show high priority items first
    const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
    filteredList.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));

    setRequests(filteredList);
  }, [priorityFilter, statusFilter]);

  React.useEffect(() => {
    filterAndSortRequests();
  }, [filterAndSortRequests]);

  const getResourceName = (assetId: string | undefined) => {
    if (!assetId) return 'Facility Issue';
    return mockResources.find(r => r.assetId === assetId)?.name || 'Unknown Equipment';
  };
  
  const getUserName = (userId: string) => allUsers.find(u => u.uid === userId)?.name || 'Unknown';


  return (
    <div className="space-y-4">
        <div className="flex gap-4">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by priority..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Priorities</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="rounded-md border">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Date Reported</TableHead>
                <TableHead>Item / Zone</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {requests.length > 0 ? (
                requests.map((request) => (
                <TableRow key={request.workOrderId} className={cn(request.priority === 'High' && 'bg-destructive/10')}>
                    <TableCell>{format(new Date(request.dateReported), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{getResourceName(request.assetId)}</TableCell>
                    <TableCell>{request.description}</TableCell>
                    <TableCell>{getUserName(request.reportedByUserId)}</TableCell>
                    <TableCell>
                    <Badge variant={getPriorityVariant(request.priority)}>{request.priority}</Badge>
                    </TableCell>
                    <TableCell>
                    <Badge variant={getStatusVariant(request.status)}>
                        {request.status}
                    </Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                        <AssignTechnicianDialog workOrder={request} onAssigned={filterAndSortRequests} />
                        <ResolveRequestDialog request={request} onAction={filterAndSortRequests} />
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                    No work orders match the current filters.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        </div>
    </div>
  );
}

    