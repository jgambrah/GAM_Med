'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import AddStaffModal from './AddStaffModal';

export default function StaffManagement() {
    const { user } = useAuth(); // The logged-in Director
    const db = useFirestore();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.hospitalId) return;

        // 1. QUERY ONLY THIS HOSPITAL'S STAFF (The SaaS Wall)
        const q = query(
            collection(db, "users"),
            where("hospitalId", "==", user.hospitalId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const staffList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setStaff(staffList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.hospitalId, db]);

    // 2. TOGGLE USER ACCESS (The Kill-Switch)
    const toggleAccess = async (staffMember: any) => {
        try {
            const userRef = doc(db, 'users', staffMember.id);
            await updateDoc(userRef, {
                is_active: !staffMember.is_active
            });
            
            toast.success(`Access ${!staffMember.is_active ? 'Enabled' : 'Revoked'}`, {
                description: `${staffMember.name}'s status has been updated.`
            });
        } catch (error) {
            toast.error("Update failed", { description: "You don't have permission." });
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading staff directory...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Staff Directory</h1>
                    <p className="text-muted-foreground">Manage doctors, nurses, and admins for {user?.hospitalId}</p>
                </div>
                <AddStaffModal /> 
            </div>

            <div className="border rounded-lg bg-white overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Access</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {staff.length > 0 ? (
                            staff.map((member) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {member.role.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>
                                        {member.is_active ? 
                                            <Badge className="bg-green-500 text-white">Active</Badge> : 
                                            <Badge variant="destructive">Suspended</Badge>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {/* Don't let the director disable themselves */}
                                        {member.email !== user?.email && (
                                            <Switch 
                                                checked={member.is_active} 
                                                onCheckedChange={() => toggleAccess(member)}
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No staff members registered.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
