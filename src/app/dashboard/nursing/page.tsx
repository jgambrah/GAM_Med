
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { allPatients, allAdmissions, mockCarePlans } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { Checkbox } from '@/components/ui/checkbox';
import { Patient, CarePlan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Stethoscope, Pill } from 'lucide-react';
import Link from 'next/link';

interface Task {
    id: string;
    description: string;
    status: 'Pending' | 'Completed';
    patient: Patient;
    type: 'Vitals' | 'Meds';
}

function TaskDashboard() {
    const { user } = useAuth();
    const [tasks, setTasks] = React.useState<Task[]>([]);

    React.useEffect(() => {
        if (!user) return;

        // In a real app, this would be a Firestore query for care plans
        // where a task's `assignedToUserId` matches the logged-in nurse's UID.
        const myCarePlans = mockCarePlans.filter(plan =>
            plan.interventions.some(i => i.includes('Daily BP monitoring') || i.includes('Administer'))
        );

        const generatedTasks: Task[] = [];
        myCarePlans.forEach(plan => {
            const patient = allPatients.find(p => p.patient_id === plan.patientId);
            if (!patient) return;

            plan.interventions.forEach((intervention, index) => {
                if (intervention.includes('Daily BP monitoring')) {
                    generatedTasks.push({
                        id: `${plan.planId}-vitals-${index}`,
                        description: 'Take Vital Signs',
                        status: 'Pending',
                        patient,
                        type: 'Vitals',
                    });
                }
                if (intervention.includes('Administer')) {
                     generatedTasks.push({
                        id: `${plan.planId}-meds-${index}`,
                        description: intervention,
                        status: 'Pending',
                        patient,
                        type: 'Meds',
                    });
                }
            });
        });
        setTasks(generatedTasks);

    }, [user]);

    const handleTaskCompletion = (taskId: string, completed: boolean) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId ? { ...task, status: completed ? 'Completed' : 'Pending' } : task
            )
        );
    };
    
    const tasksByPatient = tasks.reduce((acc, task) => {
        if (!acc[task.patient.patient_id]) {
            acc[task.patient.patient_id] = { patient: task.patient, tasks: [] };
        }
        acc[task.patient.patient_id].tasks.push(task);
        return acc;
    }, {} as Record<string, { patient: Patient; tasks: Task[] }>);

    if (tasks.length === 0) {
        return (
             <Card>
                <CardContent className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">You have no assigned care tasks for today.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {Object.values(tasksByPatient).map(({ patient, tasks }) => (
                <Card key={patient.patient_id}>
                    <CardHeader>
                        <CardTitle>
                             <Link href={`/dashboard/patients/${patient.patient_id}`} className="hover:underline">
                                {patient.full_name}
                            </Link>
                        </CardTitle>
                        <CardDescription>
                            Bed: {allAdmissions.find(a => a.admission_id === patient.current_admission_id)?.bed_id || 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id={task.id}
                                        checked={task.status === 'Completed'}
                                        onCheckedChange={(checked) => handleTaskCompletion(task.id, checked as boolean)}
                                    />
                                    <label
                                        htmlFor={task.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {task.description}
                                    </label>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/dashboard/patients/${patient.patient_id}?tab=${task.type.toLowerCase()}`}>
                                        {task.type === 'Vitals' ? <Stethoscope className="mr-2 h-4 w-4" /> : <Pill className="mr-2 h-4 w-4" />}
                                        {task.type === 'Vitals' ? 'Log Vitals' : 'Administer'}
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


export default function NursingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Daily Tasks</h1>
        <p className="text-muted-foreground">
          Your central hub for patient care and assigned tasks for the day.
        </p>
      </div>
      <TaskDashboard />
    </div>
  );
}
