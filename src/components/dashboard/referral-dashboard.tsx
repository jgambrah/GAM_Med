

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { Referral, User } from "@/lib/types";
import { format } from "date-fns";
import { FilePlus, MoreHorizontal, UserPlus, Stethoscope, Loader2 } from "lucide-react";
import * as React from "react";
import { ReferralForm } from "./referral-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignDoctorToReferralAction } from "@/lib/actions";

const statusConfig = {
    "Pending": { variant: "secondary" as const, label: "Pending Review" },
    "Assigned": { variant: "default" as const, label: "Assigned" },
    "Scheduled": { variant: "default" as const, label: "Scheduled" },
    "Patient Seen": { variant: "outline" as const, label: "Completed" },
    "Canceled": { variant: "destructive" as const, label: "Canceled" },
};

function AssignDoctorDialog({ referral, doctors, onAssignment }: { referral: Referral, doctors: User[], onAssignment: () => void }) {
    const { toast } = useToast();
    const [selectedDoctorId, setSelectedDoctorId] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSubmit = async () => {
        if (!selectedDoctorId) {
            toast({ variant: "destructive", title: "No Doctor Selected", description: "Please select a doctor to assign." });
            return;
        }
        setIsSubmitting(true);
        const result = await assignDoctorToReferralAction({ referralId: referral.referralId, doctorId: selectedDoctorId });
        if (result.success) {
            toast({ title: "Doctor Assigned", description: result.message });
            onAssignment(); // This will trigger a data refresh in the parent
            setIsOpen(false);
        } else {
            toast({ variant: "destructive", title: "Assignment Failed", description: result.message });
        }
        setIsSubmitting(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Stethoscope className="mr-2 h-4 w-4" />
                    Assign Doctor
                </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Doctor to Referral</DialogTitle>
                    <DialogDescription>
                        Assign a doctor to review the referral for patient: <span className="font-bold">{referral.patientDetails.fullName}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Select onValueChange={setSelectedDoctorId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a doctor..." />
                        </SelectTrigger>
                        <SelectContent>
                            {doctors.map(doc => (
                                <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !selectedDoctorId} className="w-full">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Assignment
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}


export function ReferralDashboard({ referrals, doctors }: { referrals: Referral[], doctors: User[] }) {
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [referralList, setReferralList] = React.useState(referrals);

    const handleFormSuccess = (message: string) => {
        setIsFormOpen(false);
        toast({ title: "Success", description: message });
        // Here you would typically refetch the referrals data
    };

    const handleAssignmentSuccess = () => {
        // In a real app, you would refetch data. Here we just update the state to reflect the change.
        // This is a simplified approach for the mock environment.
        toast({ title: "Data Refresh Needed", description: "In a real app, the list would now be updated." });
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Referral Management</h2>
                    <p className="text-muted-foreground">Triage and manage incoming patient referrals.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <FilePlus className="mr-2 h-4 w-4" />
                            Log New Referral
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>New Patient Referral</DialogTitle>
                            <DialogDescription>
                                Fill out the form below to log a new referral from an external provider.
                            </DialogDescription>
                        </DialogHeader>
                        <ReferralForm onFormSubmit={handleFormSuccess} />
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Incoming Referrals</CardTitle>
                    <CardDescription>A list of all patient referrals requiring action.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Patient</TableHead>
                                <TableHead>Referring Facility</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {referralList.length > 0 ? (
                                referralList.map((ref) => {
                                    const config = statusConfig[ref.status];
                                    const assignedDoctor = doctors.find(d => d.id === ref.assignedToDoctorId);
                                    return (
                                        <TableRow key={ref.referralId}>
                                            <TableCell>{format(new Date(ref.referralDate), "PPP")}</TableCell>
                                            <TableCell className="font-medium">{ref.patientDetails.fullName}</TableCell>
                                            <TableCell>{ref.referringProvider.name}</TableCell>
                                            <TableCell>{ref.referredToDepartment}</TableCell>
                                            <TableCell>
                                                <Badge variant={config.variant}>{config.label}</Badge>
                                            </TableCell>
                                            <TableCell>{assignedDoctor?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                                        {ref.status === 'Pending' && (
                                                           <AssignDoctorDialog referral={ref} doctors={doctors} onAssignment={handleAssignmentSuccess} />
                                                        )}
                                                        <DropdownMenuItem>
                                                          <UserPlus className="mr-2 h-4 w-4" />
                                                          Register as Patient
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No referrals found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
