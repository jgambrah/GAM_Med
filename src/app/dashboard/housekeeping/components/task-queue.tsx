

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HousekeepingTask } from '@/lib/types';
import { mockHousekeepingTasks } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { Check, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const getStatusVariant = (status: HousekeepingTask['status']) => {
    switch(status) {
        case 'Pending': return 'destructive';
        case 'In Progress': return 'default';
        case 'Completed': return 'secondary';
        default: return 'outline';
    }
}

export function TaskQueue() {
  const [tasks, setTasks] = React.useState<HousekeepingTask[]>(mockHousekeepingTasks);

  const handleUpdateStatus = (taskId: string, newStatus: HousekeepingTask['status']) => {
    // In a real app, this would call a server action to update the task in Firestore.
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.taskId === taskId ? { ...task, status: newStatus } : task
      )
    );
    toast.success(`Task ${taskId} has been updated to "${newStatus}".`);
  };
  
  const pendingTasks = tasks.filter(t => t.status === 'Pending');
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pendingTasks.length > 0 ? (
        pendingTasks.map(task => (
            <Card key={task.taskId} className="flex flex-col">
                <CardHeader>
                    <CardTitle>{task.type}</CardTitle>
                    <CardDescription>Location: {task.location}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                        {task.notes ? `Notes: ${task.notes}` : 'No additional notes.'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Reported {formatDistanceToNow(new Date(task.dateCreated), { addSuffix: true })}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={() => handleUpdateStatus(task.taskId, 'In Progress')}>
                        Start Task
                    </Button>
                </CardFooter>
            </Card>
        ))
      ) : (
         <div className="md:col-span-2 lg:col-span-3">
             <Card>
                <CardContent className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">No pending housekeeping tasks.</p>
                </CardContent>
            </Card>
         </div>
      )}
       {inProgressTasks.length > 0 && (
         <div className="md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-2">In Progress</h3>
             {inProgressTasks.map(task => (
                 <Card key={task.taskId} className="mb-4 bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                             <CardTitle className="text-base">{task.type} - {task.location}</CardTitle>
                             <CardDescription>
                                Task started by [Your Name]
                             </CardDescription>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleUpdateStatus(task.taskId, 'Completed')}>
                            <Check className="h-4 w-4 mr-2" /> Mark as Completed
                        </Button>
                    </CardHeader>
                 </Card>
             ))}
         </div>
       )}
    </div>
  );
}
