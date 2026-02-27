'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { mockPositions } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, ShieldAlert } from 'lucide-react';
import { StaffProfile, User as UserType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaveTab } from './components/leave-tab';
import { ProfileDetailsTab } from './components/profile-details-tab';
import { Badge } from '@/components/ui/badge';

/**
 * == SaaS Staff Member Profile ==
 * 
 * Secure personnel record viewer. 
 * Enforces logical isolation via strict hospitalId cross-check.
 */
export default function StaffProfilePage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.staffId as string;
  const { user: currentUser, loading: isAuthLoading } = useAuth();
  const firestore = useFirestore();

  // DEBUG: Track the exact Staff ID being looked up
  React.useEffect(() => {
    if (staffId) {
      console.log("Searching for Staff Record ID:", staffId);
    }
  }, [staffId]);

  // 1. Fetch live staff profile from Firestore
  const staffRef = useMemoFirebase(() => {
    if (!firestore || !staffId) return null;
    return doc(firestore, 'users', staffId);
  }, [firestore, staffId]);

  const { data: staff, isLoading: isDocLoading, error } = useDoc<UserType>(staffRef);

  // 2. SAAS SECURITY WALL
  const isAuthorized = React.useMemo(() => {
    if (isAuthLoading || isDocLoading) return true; // Assume true while loading
    if (!currentUser || !staff) return false;
    if (currentUser.role === 'super_admin') return true;
    return staff.hospitalId === currentUser.hospitalId;
  }, [currentUser, staff, isAuthLoading, isDocLoading]);

  if (isAuthLoading || isDocLoading || !firestore) {
    return (
      <div className="space-y-6 p-8">
        <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin opacity-20" />
            <Skeleton className="h-12 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!staff && !error) {
    console.error("Staff Lookup Failure: Document not found for ID", staffId);
    return notFound();
  }

  if (!isAuthorized || error) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-destructive/5 rounded-2xl border-2 border-dashed border-destructive/20 m-6">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-black text-destructive uppercase tracking-tighter">Tenant Access Violation</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
                You do not have permission to view personnel records belonging to another healthcare facility.
            </p>
            <Button variant="outline" className="mt-6 font-bold" onClick={() => router.back()}>
                Return to Safe Zone
            </Button>
        </div>
    );
  }

  const staffPosition = mockPositions.find(p => p.title.toLowerCase().includes(staff.role.toLowerCase()));

  // Construct profile for secondary tabs (Leave, Performance)
  const staffProfile: StaffProfile = {
      staffId: staff.uid,
      hospitalId: staff.hospitalId,
      firstName: staff.name.split(' ')[0],
      lastName: staff.name.split(' ').slice(1).join(' ') || '',
      positionId: staffPosition?.positionId || '',
      department: staff.department || 'Clinical',
      employmentStatus: staff.is_active ? 'Active' : 'Inactive',
      recurringAllowances: [],
      recurringDeductions: [],
      leaveBalances: staff.leaveBalances || { 'Annual Leave': 20, 'Sick Leave': 10 }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
            </Button>
            <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">{staff.name}</h1>
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-tighter mt-1">
                    {staffPosition?.title || staff.role.replace('_', ' ')} | ID: {staff.id || staff.uid}
                </p>
            </div>
        </div>
        <Badge variant="outline" className="h-8 px-4 border-blue-200 text-blue-700 bg-blue-50 font-black uppercase tracking-widest">
            Facility: {staff.hospitalId}
        </Badge>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="profile">Credentials & Demographics</TabsTrigger>
            <TabsTrigger value="performance">Appraisals</TabsTrigger>
            <TabsTrigger value="leave">Leave & Attendance</TabsTrigger>
            <TabsTrigger value="payroll">Compensation</TabsTrigger>
        </TabsList>
         <TabsContent value="profile" className="mt-6">
            <ProfileDetailsTab staff={staff} user={currentUser} setStaff={() => {}} />
        </TabsContent>
         <TabsContent value="performance" className="mt-6">
            <div className="p-12 text-center border-2 border-dashed rounded-2xl opacity-40">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Performance Engine Locked to {staff.hospitalId}</p>
            </div>
        </TabsContent>
        <TabsContent value="leave" className="mt-6">
            <LeaveTab staffProfile={staffProfile} setStaffProfile={() => {}} user={currentUser} />
        </TabsContent>
        <TabsContent value="payroll" className="mt-6">
            <div className="p-12 text-center border-2 border-dashed rounded-2xl opacity-40">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Salary Data Restricted: ISO-27001 Scoped</p>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
