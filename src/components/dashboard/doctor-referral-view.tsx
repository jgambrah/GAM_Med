
"use client";

import * as React from "react";
import type { Referral, User } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "../ui/button";

interface DoctorReferralViewProps {
  user: User;
  allReferrals: Referral[];
}

export function DoctorReferralView({ user, allReferrals }: DoctorReferralViewProps) {
  const myReferrals = React.useMemo(() => {
    return allReferrals.filter(r => r.assignedToDoctorId === user.id);
  }, [user.id, allReferrals]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-headline">My Assigned Referrals</h2>
        <p className="text-muted-foreground">
          A list of all patient referrals assigned to you for review and action.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Referrals ({myReferrals.length})</CardTitle>
          <CardDescription>
            Click on a referral to view full details and schedule an appointment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referral Date</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead>Referring Facility</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myReferrals.length > 0 ? (
                myReferrals.map((referral) => (
                  <TableRow key={referral.referralId}>
                    <TableCell>{format(new Date(referral.referralDate), "PPP")}</TableCell>
                    <TableCell className="font-medium">{referral.patientDetails.fullName}</TableCell>
                    <TableCell>{referral.referringProvider.name}</TableCell>
                    <TableCell>
                      <Badge variant={referral.status === "Assigned" ? "secondary" : "default"}>
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    You have no assigned referrals at this time.
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
