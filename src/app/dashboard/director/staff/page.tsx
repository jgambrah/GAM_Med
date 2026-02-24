'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import InviteStaffModal from '@/components/director/InviteStaffModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * == Hospital Director: Staff Management ==
 * 
 * Provides a real-time directory of all staff members belonging to the Director's hospital.
 * Enforces strict multi-tenant isolation via hospitalId filtering.
 */
export default function StaffManagement() {
    const { user } = useAuth();
    const db = useFirestore();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.hospitalId) return;

        // SAAS FILTER: Only show users belonging to this director's hospital
        // This query matches the requirements for the "SaaS Wall" logical isolation
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p>Loading staff directory...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
                    <p className="text-muted-foreground">Manage the clinical and administrative team for <strong>{user?.hospitalId}</strong>.</p>
                </div>
                <InviteStaffModal />
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Hospital Personnel</CardTitle>
                    <CardDescription>A real-time list of active and pending staff members for your facility.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="pl-6">Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.length > 0 ? (
                                staff.map((member: any) => (
                                    <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-medium pl-6">{member.name}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell className="capitalize">{member.role.replace('_', ' ')}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.is_active ? "secondary" : "destructive"}>
                                                {member.is_active ? "Active" : "Suspended"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
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
