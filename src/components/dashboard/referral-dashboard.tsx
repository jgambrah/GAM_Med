
"use client";

import * as React from "react";
import { allReferrals, allUsers } from "@/lib/data";
import type { Referral, User } from "@/lib/types";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FilePlus2, UserCheck, AlertCircle } from "lucide-react";
import { ReferralForm } from "./referral-form";
import { AssignDoctorDialog } from "./assign-doctor-dialog";
import { useAuth } from "../auth-provider";
import { DoctorReferralView } from "./doctor-referral-view";

interface AdminReferralViewProps {
  referrals: Referral[];
  doctors: User[];
  onReferralUpdate: () => void;
}

function AdminReferralView({ referrals, doctors, onReferralUpdate }: AdminReferralViewProps) {
  const [selectedReferral, setSelectedReferral] = React.useState<Referral | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = React.useState(false);
  const [isNewReferralDialogOpen, setIsNewReferralDialogOpen] = React.useState(false);

  const handleAssignment = (updatedReferral: Referral) => {
    onReferralUpdate();
    setIsAssignDialogOpen(false);
  };
  
  const handleNewReferral = (newReferral: Referral) => {
    onReferralUpdate();
    setIsNewReferralDialogOpen(false);
  }

  const renderTable = (filteredReferrals: Referral[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referral Date</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Referring Provider</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredReferrals.length > 0 ? (
          filteredReferrals.map((r) => (
            <TableRow key={r.referralId}>
              <TableCell>{format(new Date(r.referralDate), "PPP")}</TableCell>
              <TableCell>{r.patientDetails.fullName}</TableCell>
              <TableCell>{r.referringProvider.name}</TableCell>
              <TableCell>{r.referredToDepartment}</TableCell>
              <TableCell><Badge variant={r.status === 'Pending' ? 'destructive' : 'secondary'}>{r.status}</Badge></TableCell>
              <TableCell className="text-right">
                {r.status === 'Pending' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedReferral(r);
                      setIsAssignDialogOpen(true);
                    }}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Assign
                  </Button>
                )}
                 {r.status === 'Assigned' && (
                  <span className="text-sm text-muted-foreground">Assigned to {r.doctorName}</span>
                 )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No referrals in this category.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">
              Referral Management
            </h2>
            <p className="text-muted-foreground">
              Process incoming referrals and assign them to doctors.
            </p>
          </div>
          <Dialog open={isNewReferralDialogOpen} onOpenChange={setIsNewReferralDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FilePlus2 className="mr-2 h-4 w-4" />
                Add New Referral
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[725px]">
              <DialogHeader>
                <DialogTitle>New External Referral</DialogTitle>
                <DialogDescription>
                  Enter details from the referral letter.
                </DialogDescription>
              </DialogHeader>
              <ReferralForm onFormSubmit={handleNewReferral} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="all">All Referrals</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Referrals</CardTitle>
                <CardDescription>
                  These referrals need to be reviewed and assigned to a doctor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(referrals.filter((r) => r.status === 'Pending'))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="assigned" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Referrals</CardTitle>
                <CardDescription>
                  These referrals have been assigned and are awaiting an appointment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(referrals.filter((r) => r.status === 'Assigned'))}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="all" className="mt-4">
             <Card>
              <CardHeader>
                <CardTitle>All Referrals</CardTitle>
                <CardDescription>A complete history of all referrals.</CardDescription>
              </CardHeader>
              <CardContent>
                {renderTable(referrals)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Referral</DialogTitle>
            <DialogDescription>
              Select a doctor to handle the referral for{" "}
              {selectedReferral?.patientDetails.fullName}.
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <AssignDoctorDialog
              referral={selectedReferral}
              doctors={doctors}
              onAssignment={handleAssignment}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


export function ReferralDashboard() {
  const { user, loading } = useAuth();
  const [referrals, setReferrals] = React.useState(allReferrals);
  const doctors = React.useMemo(() => allUsers.filter(u => u.role === 'Doctor'), []);

  const handleReferralUpdate = () => {
    setReferrals([...allReferrals]);
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return (
       <Card className="m-auto mt-24 max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertCircle className="text-destructive" /> Authentication Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Could not verify user identity. Please try logging out and back in.</p>
            </CardContent>
        </Card>
    )
  }

  if (user.role === 'Admin') {
     return <AdminReferralView referrals={referrals} doctors={doctors} onReferralUpdate={handleReferralUpdate} />;
  }
  
  if (user.role === 'Doctor') {
      return <DoctorReferralView user={user} allReferrals={referrals} />;
  }

  // Fallback for other roles
  return <p>Referral dashboard not available for your role.</p>;
}
