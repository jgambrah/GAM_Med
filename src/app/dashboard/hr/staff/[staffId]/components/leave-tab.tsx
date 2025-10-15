
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { MyLeaveHistory } from '@/app/dashboard/my-leave/components/my-leave-history';
import { EditLeaveBalancesDialog } from './edit-leave-balances-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { LeaveRequest, StaffProfile, User } from '@/lib/types';
import { mockLeaveRequests } from '@/lib/data';

interface LeaveTabProps {
  staffProfile: StaffProfile;
  setStaffProfile: (profile: StaffProfile) => void;
  user: User | null;
}

export function LeaveTab({ staffProfile, setStaffProfile, user }: LeaveTabProps) {
  const [allLeaveRequests] = useLocalStorage<LeaveRequest[]>('allLeaveRequests', mockLeaveRequests);

  const staffLeaveRequests = React.useMemo(() => {
    return allLeaveRequests.filter(req => req.staffId === staffProfile.staffId);
  }, [allLeaveRequests, staffProfile.staffId]);

  const handleBalancesSaved = (newBalances: Record<string, number>) => {
    setStaffProfile({ ...staffProfile, leaveBalances: newBalances });
    toast.success("Leave balances have been updated.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leave Balances</CardTitle>
            <CardDescription>Current available leave days for this staff member.</CardDescription>
          </div>
          {user?.role === 'admin' && (
            <EditLeaveBalancesDialog
              balances={staffProfile.leaveBalances || {}}
              onSave={handleBalancesSaved}
            />
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {staffProfile.leaveBalances && Object.keys(staffProfile.leaveBalances).length > 0 ? (
            Object.entries(staffProfile.leaveBalances).map(([type, days]) => (
              <div key={type}>
                <p className="text-sm font-medium text-muted-foreground">{type}</p>
                <p className="text-2xl font-bold">{days} <span className="text-lg font-normal">days</span></p>
              </div>
            ))
          ) : (
             <p className="text-sm text-muted-foreground col-span-full">No leave balances set for this user.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>A record of all leave requests for this staff member.</CardDescription>
        </CardHeader>
        <CardContent>
          <MyLeaveHistory requests={staffLeaveRequests} />
        </CardContent>
      </Card>
    </div>
  );
}

    