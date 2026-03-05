'use client';
import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Edit2, UserPlus, ShieldAlert, Loader2, Banknote } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function StaffDirectory() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isAuthorized = userProfile?.role === 'DIRECTOR' || userProfile?.role === 'HR_MANAGER' || userProfile?.role === 'ADMIN';
  const hospitalId = userProfile?.hospitalId;

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "users"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);

  const { data: staff, isLoading: isStaffLoading } = useCollection(staffQuery);

  const isLoading = isUserLoading || isProfileLoading || isStaffLoading;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
      return (
         <div className="flex flex-1 items-center justify-center bg-background p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You are not authorized to view this page.</p>
                 <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
            </div>
         </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
            <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Personnel <span className="text-primary">Register</span></h1>
            <p className="text-muted-foreground font-medium">Directory of all staff members at your facility.</p>
        </div>
        <Button asChild>
            <Link href="/staff/add"><UserPlus />Add New Staff</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff?.map(member => (
          <div key={member.id} className="bg-card p-6 rounded-2xl border shadow-sm relative group overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${member.is_active ? 'bg-green-100/50 text-green-700 border border-green-200' : 'bg-red-100/50 text-red-700 border border-red-200'}`}>
                {member.role || 'NO ROLE'}
              </div>
              <div className="flex items-center gap-2">
                 <Link href={`/hr/payroll/profiles/${member.id}`} className="p-2 bg-muted/50 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                    <Banknote size={16} />
                </Link>
                <Link href={`/staff/edit/${member.id}`} className="p-2 bg-muted/50 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                    <Edit2 size={16} />
                </Link>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-card-foreground uppercase tracking-tight">{member.fullName}</h3>
            <p className="text-xs text-muted-foreground font-bold mb-4">{member.email}</p>
            
            <div className="space-y-2 border-t pt-4">
               <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>License #:</span>
                  <span className="text-card-foreground font-mono">{member.licenseNumber || 'N/A'}</span>
               </div>
               <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                  <span>Department:</span>
                  <span className="text-card-foreground">{member.department || 'GENERAL'}</span>
               </div>
            </div>

            {/* Warning if profile is incomplete */}
            {!member.onboardingComplete && !member.ghanaCardId && (
              <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-100/50 p-2 rounded-lg text-[9px] font-bold uppercase border border-amber-200">
                <ShieldAlert size={12} /> Profile Incomplete
              </div>
            )}
          </div>
        ))}
        {staff?.length === 0 && (
            <p className="text-muted-foreground italic md:col-span-3 text-center py-10">No staff members have been onboarded yet.</p>
        )}
      </div>
    </div>
  );
}

    
