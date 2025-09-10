
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaveRequestDialog } from '../my-schedule/components/leave-request-dialog';
import { MyLeaveHistory } from './components/my-leave-history';
import { useAuth } from '@/hooks/use-auth';
import { mockStaffProfiles } from '@/lib/data';

function LeaveBalances() {
    const { user } = useAuth();
    // In a real app, this would come from the user's profile document.
    const profile = mockStaffProfiles.find(p => p.staffId === user?.uid);
    
    // Mock balances if not found in profile for demo purposes
    const balances = profile?.leaveBalances || {
        'Annual Leave': 15,
        'Sick Leave': 10,
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Leave Balances</CardTitle>
                <CardDescription>Your available leave days for the year.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(balances).map(([type, days]) => (
                     <div key={type}>
                        <p className="text-sm font-medium text-muted-foreground">{type}</p>
                        <p className="text-2xl font-bold">{days} <span className="text-lg font-normal">days</span></p>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}


export default function MyLeavePage() {
  const [key, setKey] = React.useState(0);

  const handleRequestSubmitted = () => {
    setKey(prevKey => prevKey + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Leave</h1>
          <p className="text-muted-foreground">
            Request and track your leave of absence.
          </p>
        </div>
        <LeaveRequestDialog />
      </div>
       
       <LeaveBalances />

      <Card>
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
          <CardDescription>
            A record of all your submitted leave requests and their current status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MyLeaveHistory key={key} />
        </CardContent>
      </Card>
    </div>
  );
}
