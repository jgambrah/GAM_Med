
'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import InviteStaffModal from '@/components/director/InviteStaffModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, UserSearch } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';

/**
 * == Hospital Director: Staff Management Workbench ==
 * 
 * Provides a real-time directory of all staff members belonging to the Director's hospital.
 * Enforces strict multi-tenant isolation via hospitalId filtering (The SaaS Wall).
 */
export default function StaffManagement() {
    const { user } = useAuth();
    const db = useFirestore();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.hospitalId) return;

        // SAAS FILTER: Only show users belonging to this director's hospital
        const q = query(
            collection(db, "users"),
            where("hospitalId", "==", user.hospitalId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStaff(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.hospitalId, db]);

    const toggleAccess = async (member: any) => {
        try {
            const userRef = doc(db, 'users', member.id);
            await updateDoc(userRef, { is_active: !member.is_active });
            toast.success("Status Updated");
        } catch (e) {
            toast.error("Permission Denied");
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-xs font-bold uppercase tracking-widest">Syncing Personnel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
                    <p className="text-muted-foreground">Independent clinical and administrative team for <strong>{user?.hospitalId}</strong>.</p>
                </div>
                <InviteStaffModal />
            </div>

            <Card className="shadow-sm border-none ring-1 ring-slate-200 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                    <CardTitle className="text-lg">Facility Personnel Register</CardTitle>
                    <CardDescription>A real-time list of staff members logically isolated to your facility.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Name</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Email</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Role</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                <TableHead className="text-right pr-6 text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.length > 0 ? (
                                staff.map((member: any) => (
                                    <TableRow key={member.id} className="hover:bg-muted/50 transition-colors h-16">
                                        <TableCell className="font-bold text-slate-900 pl-6">{member.name}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{member.email}</TableCell>
                                        <TableCell className="capitalize text-xs font-medium">{member.role.replace('_', ' ')}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.is_active ? "secondary" : "destructive"} className="text-[9px] font-black uppercase tracking-widest">
                                                {member.is_active ? "Active" : "Suspended"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end items-center gap-2">
                                                <Switch checked={member.is_active} onCheckedChange={() => toggleAccess(member)} disabled={member.email === user?.email} />
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-40">Management</DropdownMenuLabel>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard/hr/staff/${member.uid || member.id}`} className="cursor-pointer">
                                                                <UserSearch className="mr-2 h-4 w-4" /> View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive cursor-pointer">
                                                            Reset Credentials
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No staff members found for your facility.
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
