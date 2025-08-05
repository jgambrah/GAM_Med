
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
import { MoreHorizontal, PlusCircle, FileText } from "lucide-react";
import { ReferralForm } from "./referral-form";
import type { Referral, User } from "@/lib/types";
import { format } from "date-fns";
import { allUsers } from "@/lib/data";
import { AssignDoctorDialog } from "./assign-doctor-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../auth-provider";

interface ReferralDashboardProps {
  referrals: Referral[];
  doctors: User[];
}

const getStatusVariant = (status: Referral['status']) => {
  switch (status) {
    case 'Pending':
      return 'destructive';
    case 'Assigned':
      return 'default';
    case 'Completed':
      return 'outline';
    default:
      return 'secondary';
  }
};

export function ReferralDashboard({ referrals, doctors }: ReferralDashboardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isNewReferralOpen, setIsNewReferralOpen] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const [selectedReferral, setSelectedReferral] = React.useState<Referral | null>(null);

  const [referralList, setReferralList] = React.useState(referrals);
  const [filter, setFilter] = React.useState<Referral['status'] | 'All'>('Pending');

  React.useEffect(() => {
    setReferralList(referrals);
  }, [referrals]);

  const onNewReferral = (newReferral: Referral) => {
    setReferralList(prev => [newReferral, ...prev]);
    setIsNewReferralOpen(false);
    toast({
        title: "Referral Created",
        description: `New referral for ${newReferral.patientDetails.fullName} created successfully.`
    });
  };
  
  const onAssignmentSuccess = (updatedReferral: Referral) => {
     setReferralList(prev => 
        prev.map(r => r.referralId === updatedReferral.referralId ? updatedReferral : r)
     );
     // Close the details dialog after assignment
     setIsDetailsOpen(false);
     setSelectedReferral(null);
     toast({
        title: "Assignment Successful",
        description: `Referral has been assigned to a doctor.`
     })
  }

  const filteredReferrals = React.useMemo(() => {
    if (filter === 'All') return referralList;
    return referralList.filter(r => r.status === filter);
  }, [filter, referralList]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-headline text-2xl">Referral Inbox</CardTitle>
              <CardDescription>
                A list of all patient referrals. Default view shows pending cases.
              </CardDescription>
            </div>
            {user?.role === 'Admin' && (
            <Dialog open={isNewReferralOpen} onOpenChange={setIsNewReferralOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Referral
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Referral</DialogTitle>
                  <DialogDescription>
                    Fill out the form below to create a new patient referral.
                  </DialogDescription>
                </DialogHeader>
                <ReferralForm onFormSubmit={onNewReferral} />
              </DialogContent>
            </Dialog>
            )}
          </div>
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="pt-4">
            <TabsList>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Assigned">Assigned</TabsTrigger>
                <TabsTrigger value="All">All Referrals</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Referring Facility</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.length > 0 ? (
                filteredReferrals.map((ref) => {
                    const assignedDoctor = ref.assignedToDoctorId ? allUsers.find(u => u.id === ref.assignedToDoctorId) : null;
                    return (
                        <TableRow key={ref.referralId}>
                            <TableCell>{format(new Date(ref.referralDate), 'PPP')}</TableCell>
                            <TableCell className="font-medium">{ref.patientDetails.fullName}</TableCell>
                            <TableCell>{ref.referringProvider.name}</TableCell>
                            <TableCell>{assignedDoctor?.name || 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(ref.status)}>{ref.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => {
                                    setSelectedReferral(ref);
                                    setIsDetailsOpen(true);
                                }}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })
               ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="font-semibold">No Referrals Found</p>
                    <p className="text-muted-foreground text-sm">There are no referrals matching the current filter.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Details/Assignment Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>
              Full details for referral ID: {selectedReferral?.referralId}
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4 py-4 text-sm">
                <p><strong>Patient:</strong> {selectedReferral.patientDetails.fullName}</p>
                <p><strong>Contact:</strong> {selectedReferral.patientDetails.contactPhone}</p>
                <p><strong>Reason:</strong> {selectedReferral.patientDetails.reasonForReferral}</p>
                <p><strong>Referring Facility:</strong> {selectedReferral.referringProvider.name} ({selectedReferral.referringProvider.contact})</p>
                <p><strong>Department:</strong> {selectedReferral.referredToDepartment}</p>
                <p><strong>Assigned Doctor:</strong> {allUsers.find(u => u.id === selectedReferral.assignedToDoctorId)?.name || 'Not yet assigned'}</p>
                
                {/* Show assignment UI only for Admins and on Pending referrals */}
                {user?.role === 'Admin' && selectedReferral.status === 'Pending' && (
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-2 mt-2">Assign Doctor</h3>
                      <AssignDoctorDialog 
                        referral={selectedReferral} 
                        doctors={doctors} 
                        onAssignment={onAssignmentSuccess} 
                      />
                    </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
