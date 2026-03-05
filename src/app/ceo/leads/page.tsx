'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Loader2, ShieldAlert, Mail, Phone, Building2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Define the Lead type for type safety
interface Lead {
  id: string;
  hospitalName: string;
  contactName: string;
  email: string;
  phone?: string;
  status: 'new' | 'contacted' | 'demoed' | 'closed';
  createdAt: {
    toDate: () => Date;
  };
  mrnPrefix?: string;
}

export default function LeadsPipelinePage() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const leadsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'leads'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: leads, isLoading: areLeadsLoading } = useCollection<Lead>(leadsQuery);
  
  const isOverallLoading = isUserAuthLoading || isProfileLoading;

  if (isOverallLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || userProfile?.role !== 'SUPER_ADMIN') {
     return (
         <div className="flex flex-1 items-center justify-center p-4">
            <div className="text-center">
                <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have SUPER_ADMIN privileges.</p>
                 <Button onClick={() => router.push('/login')} className="mt-4">Return to Login</Button>
            </div>
         </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sales Pipeline</h1>
        <p className="text-muted-foreground">Manage incoming Demo Requests and prospective Hospital Directors.</p>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facility & Lead</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areLeadsLoading && (
                <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            )}
            {!areLeadsLoading && (!leads || leads.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="p-8 text-center text-muted-foreground italic">
                  No active leads found in the pipeline.
                </TableCell>
              </TableRow>
            ) : (
              leads?.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded text-primary hidden md:block">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <p className="font-bold">{lead.hospitalName}</p>
                        <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Mail size={12} /> {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs">
                          <Phone size={12} /> {lead.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className="uppercase bg-yellow-100/10 text-yellow-400 border-yellow-400/50">
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link 
                      href={`/app-ceo/onboard?hospitalName=${encodeURIComponent(lead.hospitalName)}&directorEmail=${encodeURIComponent(lead.email)}&directorName=${encodeURIComponent(lead.contactName)}&mrnPrefix=${encodeURIComponent(lead.mrnPrefix || '')}`}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Provision Facility <ArrowRight size={14} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
