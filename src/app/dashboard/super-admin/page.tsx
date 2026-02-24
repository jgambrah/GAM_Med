'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CreateHospitalModal from '@/components/super-admin/CreateHospitalModal';
import { Hospital } from '@/lib/types';

export default function SuperAdminDashboard() {
    const db = useFirestore();
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [stats, setStats] = useState({ totalHospitals: 0, totalPatients: 0, totalUsers: 0 });

    useEffect(() => {
        if (!db) return;

        // 1. Listen to all hospitals (God Mode enabled for super_admin role)
        const unsubHospitals = onSnapshot(collection(db, "hospitals"), (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Hospital));
            setHospitals(list);
            setStats(prev => ({ ...prev, totalHospitals: snap.size }));
        });

        // 2. Fetch Global Stats (God Mode)
        const fetchGlobalStats = async () => {
            try {
                const [patientsSnap, usersSnap] = await Promise.all([
                    getDocs(collection(db, "patients")),
                    getDocs(collection(db, "users"))
                ]);
                
                setStats(prev => ({ 
                    ...prev, 
                    totalPatients: patientsSnap.size,
                    totalUsers: usersSnap.size 
                }));
            } catch (e) {
                console.error("Global stats fetch failed:", e);
            }
        };
        fetchGlobalStats();

        return () => unsubHospitals();
    }, [db]);

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Platform Control Tower</h1>
                    <p className="text-muted-foreground">Global oversight and tenant management for GamMed SaaS.</p>
                </div>
                <CreateHospitalModal />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800 uppercase tracking-wider">Total Facilities</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">{stats.totalHospitals}</div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-800 uppercase tracking-wider">Platform Patients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-900">{stats.totalPatients.toLocaleString()}</div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-800 uppercase tracking-wider">Active Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-900">{stats.totalUsers}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Global Tenant Directory</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border mx-6 mb-6">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Hospital Name</TableHead>
                                    <TableHead>ID / Slug</TableHead>
                                    <TableHead>Director Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Registered</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hospitals.length > 0 ? (
                                    hospitals.map((hosp: any) => (
                                        <TableRow key={hosp.id}>
                                            <TableCell className="font-semibold">{hosp.name}</TableCell>
                                            <TableCell><code className="text-xs bg-muted px-1 rounded">{hosp.id}</code></TableCell>
                                            <TableCell>{hosp.ownerEmail || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={hosp.status === 'active' ? "default" : "secondary"}>
                                                    {hosp.status === 'active' ? "Active" : "Suspended"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {hosp.createdAt ? (typeof hosp.createdAt === 'string' ? new Date(hosp.createdAt).toLocaleDateString() : new Date(hosp.createdAt.seconds * 1000).toLocaleDateString()) : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                                            No hospital tenants found on the platform.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
