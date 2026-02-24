
'use client';

import * as React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Referral } from '@/lib/types';
import { ReferralsList } from './components/referrals-list';
import { CreateReferralDialog } from './components/create-referral-dialog';
import { Loader2, Inbox, Send } from 'lucide-react';

/**
 * == SaaS Referral Hub: Inter-Hospital Collaboration ==
 * 
 * Provides a secure "Window" between tenants. This dashboard handles both
 * Incoming referrals (we are the Receiver) and Outgoing referrals (we are the Sender).
 */
export default function ReferralsPage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  // 1. LIVE QUERY: Incoming Referrals (toHospitalId == myHospitalId)
  const incomingQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'referrals'),
        where('toHospitalId', '==', user.hospitalId),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: incomingReferrals, isLoading: isIncomingLoading } = useCollection<Referral>(incomingQuery);

  // 2. LIVE QUERY: Outgoing Referrals (fromHospitalId == myHospitalId)
  const outgoingQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'referrals'),
        where('fromHospitalId', '==', user.hospitalId),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: outgoingReferrals, isLoading: isOutgoingLoading } = useCollection<Referral>(outgoingQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Network</h1>
          <p className="text-muted-foreground">
            Securely collaborate with other facilities in the GamMed network.
          </p>
        </div>
        <CreateReferralDialog />
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="incoming" className="gap-2">
            <Inbox className="h-4 w-4" />
            Incoming Requests
            {incomingReferrals && incomingReferrals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {incomingReferrals.length}
                </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="gap-2">
            <Send className="h-4 w-4" />
            Outgoing Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>Referrals Inbox</CardTitle>
              <CardDescription>Patients referred to <strong>{user?.hospitalId}</strong> for specialized care.</CardDescription>
            </CardHeader>
            <CardContent>
              {isIncomingLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                  <ReferralsList referrals={incomingReferrals || []} type="incoming" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing" className="mt-4">
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <CardTitle>Sent Referrals</CardTitle>
              <CardDescription>Track status of patients you have referred to other network facilities.</CardDescription>
            </CardHeader>
            <CardContent>
              {isOutgoingLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : (
                  <ReferralsList referrals={outgoingReferrals || []} type="outgoing" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
