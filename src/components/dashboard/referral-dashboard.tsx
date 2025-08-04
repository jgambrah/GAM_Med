
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { allReferrals } from "@/lib/data";
import type { Referral, User } from "@/lib/types";
import { format } from "date-fns";
import { FilePlus, MoreHorizontal, UserPlus } from "lucide-react";
import * as React from "react";
import { ReferralForm } from "./referral-form";

const statusConfig = {
    "Pending Review": { variant: "secondary" as const, label: "Pending Review" },
    "Assigned": { variant: "default" as const, label: "Assigned" },
    "Completed": { variant: "outline" as const, label: "Completed" },
    "Declined": { variant: "destructive" as const, label: "Declined" },
};

export function ReferralDashboard({ referrals, doctors }: { referrals: Referral[], doctors: User[] }) {
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const handleFormSuccess = (message: string) => {
        setIsFormOpen(false);
        toast({ title: "Success", description: message });
        // Here you would typically refetch the referrals data
    };

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
                                <TableHead>Urgency</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {referrals.length > 0 ? (
                                referrals.map((ref) => {
                                    const config = statusConfig[ref.status];
                                    const assignedDoctor = doctors.find(d => d.id === ref.assignedToDoctorId);
                                    return (
                                        <TableRow key={ref.referralId}>
                                            <TableCell>{format(new Date(ref.referralDate), "PPP")}</TableCell>
                                            <TableCell className="font-medium">{ref.patientFirstName} {ref.patientLastName}</TableCell>
                                            <TableCell>{ref.referringProviderFacility}</TableCell>
                                            <TableCell>
                                                <Badge variant={ref.urgency === 'Urgent' ? 'destructive' : 'secondary'}>{ref.urgency}</Badge>
                                            </TableCell>
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
                                                        <DropdownMenuItem>Assign Doctor</DropdownMenuItem>
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
