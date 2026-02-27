'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { collection, query, orderBy, where, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Hospital } from '@/lib/types';
import { MoreHorizontal, Building2, ShieldCheck, CreditCard, Loader2, ShieldAlert, Monitor, Wrench } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { ExtendTrialDialog } from '@/components/super-admin/ExtendTrialDialog';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

/**
 * == Super Admin: Global Tenant Registry ==
 * 
 * Provides a high-fidelity directory of all hospitals on the platform.
 * Includes direct controls for trial management and subscription oversight.
 */
export function HospitalList() {
  const db = useFirestore();
  const { user } = useAuth();

  const hospitalsQuery = useMemoFirebase(() => {
    if (!user || user.role !== 'super_admin') return null;
    return query(collection(db, 'hospitals'), orderBy('createdAt', 'desc'));
  }, [db, user]);

  const { data: hospitals, isLoading } = useCollection<Hospital>(hospitalsQuery);

  /**
   * == IDENTITY REPAIR (FOR HOMELESS USERS) ==
   * This manual trigger fixes users (like Marcus) whose security tokens
   * are missing the required 'hospitalId' claim.
   */
  const handleRepairIdentity = async (hospitalId: string, email: string) => {
    try {
        toast.loading(`Repairing identity for ${email}...`);
        
        // 1. Find the UID for the email
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);
        
        if (snap.empty) throw new Error("No user profile found for this owner email.");
        const uid = snap.docs[0].data().uid;

        // 2. Call the Repair API
        const res = await fetch('/api/admin/repair-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, hospitalId, role: 'director' })
        });

        if (!res.ok) throw new Error("API call failed.");

        toast.dismiss();
        toast.success("Identity Repaired", {
            description: `Claims synced for ${email}. Ask the user to log in again.`
        });
    } catch (e: any) {
        toast.dismiss();
        toast.error("Repair Failed", { description: e.message });
    }
  };

  if (isLoading) {
    return (
        <div className="p-20 text-center flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Syncing Tenant Registry...</p>
        </div>
    );
  }

  return (
    <div className="rounded-2xl border shadow-xl bg-white overflow-hidden border-none ring-1 ring-slate-200">
      <Table>
        <TableHeader className="bg-slate-50 border-b">
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Hospital / Tenant</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Plan & Status</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest">Trial Window</TableHead>
            <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Controls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hospitals && hospitals.length > 0 ? (
            hospitals.map((hospital) => {
              const trialDate = hospital.trialEndsAt?.toDate 
                ? hospital.trialEndsAt.toDate() 
                : (hospital.trialEndsAt ? new Date(hospital.trialEndsAt) : null);
              
              const isExpired = trialDate && trialDate < new Date();

              return (
                <TableRow key={hospital.hospitalId} className="hover:bg-slate-50/80 transition-colors border-b last:border-0 h-24">
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                            <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 text-lg leading-tight">{hospital.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground uppercase tracking-tighter">{hospital.hospitalId}</code>
                                {hospital.isInternal && <Badge variant="outline" className="text-[8px] h-4 border-blue-200 text-blue-600 bg-blue-50">PLATFORM HQ</Badge>}
                            </div>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                        <Badge className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm border-none",
                            hospital.subscriptionTier === 'enterprise' ? 'bg-purple-600' : 'bg-blue-600'
                        )}>
                            {hospital.subscriptionTier}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                            <div className={cn("h-1.5 w-1.5 rounded-full", hospital.status === 'active' ? 'bg-green-500' : 'bg-red-500')} />
                            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-500">{hospital.subscriptionStatus}</p>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {trialDate ? (
                        <div className="space-y-1">
                            <p className="text-xs font-black text-slate-700">{format(trialDate, 'MMM dd, yyyy')}</p>
                            <Badge 
                                variant={isExpired ? "destructive" : "secondary"} 
                                className="text-[8px] font-black uppercase h-4"
                            >
                                {isExpired ? 'Expired' : 'Days Remaining'}
                            </Badge>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-green-600">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Paid Seat</span>
                        </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end items-center gap-3">
                        {user?.role === 'super_admin' && !hospital.isInternal && (
                            <ExtendTrialDialog hospital={hospital} />
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-slate-100 transition-colors">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-2xl border-none ring-1 ring-slate-200">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 px-2 py-3">Tenant Operations</DropdownMenuLabel>
                                <DropdownMenuItem className="rounded-lg font-bold text-xs py-2.5 cursor-pointer">
                                    <Monitor className="mr-2 h-4 w-4 text-blue-500" /> Launch Facility Console
                                </DropdownMenuItem>
                                
                                {/* REPAIR BUTTON FOR EXISTING DIRECTORS */}
                                <DropdownMenuItem 
                                    className="rounded-lg font-bold text-xs py-2.5 cursor-pointer text-blue-600"
                                    onClick={() => handleRepairIdentity(hospital.hospitalId, hospital.ownerEmail || '')}
                                >
                                    <Wrench className="mr-2 h-4 w-4" /> Repair Identity Stamp
                                </DropdownMenuItem>

                                <DropdownMenuItem className="rounded-lg font-bold text-xs py-2.5 cursor-pointer">
                                    <CreditCard className="mr-2 h-4 w-4 text-green-500" /> Billing & Revenue History
                                </DropdownMenuItem>
                                {user?.role === 'super_admin' && !hospital.isInternal && (
                                    <>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <DropdownMenuItem className="text-destructive rounded-lg font-bold text-xs py-2.5 cursor-pointer">
                                            <ShieldAlert className="mr-2 h-4 w-4" /> Suspend Tenant Access
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-60 text-center">
                <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                    <Building2 className="h-16 w-16 mb-4" />
                    <p className="text-lg font-black tracking-tighter uppercase">Registry Empty</p>
                    <p className="text-xs font-bold text-muted-foreground">No healthcare facilities onboarded.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
