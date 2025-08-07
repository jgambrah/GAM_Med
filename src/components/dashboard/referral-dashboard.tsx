
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, UserCheck } from "lucide-react";
import { useAuth } from "../auth-provider";
import { allReferrals, allUsers } from "@/lib/data";
import type { Referral, User } from "@/lib/types";
import { format } from "date-fns";
import { ReferralForm } from "./referral-form";
import { AssignDoctorDialog } from "./assign-doctor-dialog";

const getStatusBadgeVariant = (status: Referral['status']) => {
    switch (status) {
        case 'Pending': return 'destructive';
        case 'Assigned': return 'default';
        case 'Scheduled': return 'secondary';
        case 'Patient Seen': return 'outline';
        default: return 'default';
    }
}

function AdminReferralView() {
  const [referrals, setReferrals] = React.useState<Referral[]>(allReferrals);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [selectedReferral, setSelectedReferral] = React.useState<Referral | null>(null);

  const doctors = React.useMemo(() => allUsers.filter(u => u.role === 'Doctor'), []);

  const handleFormSubmit = (newReferral: Referral) => {
    setReferrals(prev => [newReferral, ...prev]);
    setIsFormOpen(false);
  };
  
  const handleAssignment = (updatedReferral: Referral) => {
    setReferrals(prev => prev.map(r => r.referralId === updatedReferral.referralId ? updatedReferral : r));
    setIsAssignDialogOpen(false);
    setSelectedReferral(null);
  }

  const referralsByStatus = (status: Referral['status']) => {
    return referrals.filter(r => r.status === status);
  }

  const openAssignDialog = (referral: Referral) => {
    setSelectedReferral(referral);
    setIsAssignDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-headline text-2xl">Referral Inbox</CardTitle>
              <CardDescription>
                Manage incoming patient referrals and assign them to doctors.
              </CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2" />
                        Add New Referral
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>New Patient Referral</DialogTitle>
                        <DialogDescription>Enter the details from the referral letter.</DialogDescription>
                    </DialogHeader>
                    <ReferralForm onFormSubmit={handleFormSubmit} />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pending ({referralsByStatus('Pending').length})</TabsTrigger>
                    <TabsTrigger value="assigned">Assigned ({referralsByStatus('Assigned').length})</TabsTrigger>
                    <TabsTrigger value="all">All ({referrals.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-4">
                    <ReferralTable referrals={referralsByStatus('Pending')} onAssign={openAssignDialog} showAssignButton={true} />
                </TabsContent>
                <TabsContent value="assigned" className="mt-4">
                    <ReferralTable referrals={referralsByStatus('Assigned')} showAssignButton={false} />
                </TabsContent>
                <TabsContent value="all" className="mt-4">
                    <ReferralTable referrals={referrals} onAssign={openAssignDialog} showAssignButton={true} />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Referral</DialogTitle>
            <DialogDescription>
                Select a doctor to handle the referral for {selectedReferral?.patientDetails.fullName}.
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && <AssignDoctorDialog referral={selectedReferral} doctors={doctors} onAssignment={handleAssignment} />}
        </DialogContent>
      </Dialog>
    </>
  );
}


function DoctorReferralView({ user }: { user: User }) {
    const myReferrals = React.useMemo(() => {
        return allReferrals.filter(r => r.assignedToDoctorId === user.id);
    }, [user.id]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">My Assigned Referrals</CardTitle>
                <CardDescription>A list of all referrals that have been assigned to you for review.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ReferralTable referrals={myReferrals} showAssignButton={false} />
            </CardContent>
        </Card>
    );
}

export function ReferralDashboard() {
    const { user } = useAuth();
    if (!user) return <p>Loading...</p>;

    return user.role === 'Admin' ? <AdminReferralView /> : <DoctorReferralView user={user} />;
}


function ReferralTable({ referrals, onAssign, showAssignButton }: { referrals: Referral[], onAssign?: (referral: Referral) => void, showAssignButton: boolean }) {
    if (referrals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                <p className="mt-4 text-muted-foreground">
                No referrals in this category.
                </p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Referring Facility</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    {showAssignButton && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {referrals.map(referral => (
                    <TableRow key={referral.referralId}>
                        <TableCell>{format(new Date(referral.referralDate), "PPP")}</TableCell>
                        <TableCell>
                            <div className="font-medium">{referral.patientDetails.fullName}</div>
                            <div className="text-sm text-muted-foreground">{referral.reasonForReferral.substring(0, 40)}...</div>
                        </TableCell>
                         <TableCell>{referral.referringProvider.name}</TableCell>
                        <TableCell>{referral.doctorName || 'Unassigned'}</TableCell>
                        <TableCell><Badge variant={getStatusBadgeVariant(referral.status)}>{referral.status}</Badge></TableCell>
                        {showAssignButton && (
                            <TableCell className="text-right">
                               {referral.status === 'Pending' && onAssign && (
                                    <Button size="sm" onClick={() => onAssign(referral)}>
                                        <UserCheck className="mr-2 h-4 w-4"/>
                                        Assign
                                    </Button>
                               )}
                               {referral.status !== 'Pending' && (
                                    <span className="text-sm text-muted-foreground">No actions</span>
                               )}
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
