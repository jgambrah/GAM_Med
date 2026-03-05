'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, orderBy, limit, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { 
  Wallet, Landmark, ArrowDownCircle, ArrowUpCircle, 
  FileStack, Calculator, Receipt, TrendingUp,
  CreditCard, Banknote, ShieldCheck, Loader2, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';

export default function AccountantDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const startOfToday = useMemo(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/payments`),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
      orderBy("createdAt", "desc")
    );
  }, [firestore, hospitalId, startOfToday]);
  const { data: todayPayments, isLoading: arePaymentsLoading } = useCollection(paymentsQuery);

  const recentTransactionsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
        collection(firestore, `hospitals/${hospitalId}/payments`),
        orderBy('createdAt', 'desc'),
        limit(5)
    );
  }, [firestore, hospitalId]);
  const { data: recentTransactions } = useCollection(recentTransactionsQuery);
  
  // Queries for Fund Allocation
  const coaQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`));
  }, [firestore, hospitalId]);
  const { data: accounts, isLoading: areAccountsLoading } = useCollection(coaQuery);

  const payersQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payers`));
  }, [firestore, hospitalId]);
  const { data: payers, isLoading: arePayersLoading } = useCollection(payersQuery);

  const stats = useMemo(() => {
    if (!todayPayments) return { revenue: 0, expenses: 0, net: 0 };
    const revenue = todayPayments.reduce((acc, p) => acc + p.totalAmount, 0);
    const expenses = 0; // Placeholder for now
    return { revenue, expenses, net: revenue - expenses };
  }, [todayPayments]);
  
  const fundAllocation = useMemo(() => {
    if (!accounts || !payers) {
      return { cash: 0, momo: 0, nhis: 0 };
    }
    const cashAccount = accounts.find(a => a.name.toLowerCase().includes('cash'));
    const momoAccount = accounts.find(a => a.name.toLowerCase().includes('momo'));
    const nhisPayer = payers.find(p => p.type === 'NHIS');

    return {
      cash: cashAccount?.currentBalance || 0,
      momo: momoAccount?.currentBalance || 0,
      nhis: nhisPayer?.currentBalance || 0,
    };
  }, [accounts, payers]);

  const isLoading = isUserLoading || isProfileLoading || arePaymentsLoading || areAccountsLoading || arePayersLoading;

  if (isUserLoading || isProfileLoading) {
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
          <p className="text-muted-foreground">You are not authorized for the Accounting Console.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-foreground">Accountant <span className="text-primary">Console</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Chief Accountant: {user?.displayName}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/accountant/journals')} className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
             <Calculator size={16}/> Journal Voucher
          </Button>
          <Button onClick={() => router.push('/accountant/payments')} className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg">
             <FileStack size={16}/> New Payment
          </Button>
        </div>
      </div>

      {/* --- ACCOUNTING KPI GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {arePaymentsLoading ? <p>Loading stats...</p> : <>
            <FinanceKPI label="Total Inflow (Today)" value={`GHS ${stats.revenue.toFixed(2)}`} icon={<ArrowDownCircle size={24}/>} color="green" />
            <FinanceKPI label="Total Outflow (Today)" value={`GHS ${stats.expenses.toFixed(2)}`} icon={<ArrowUpCircle size={24}/>} color="red" />
            <FinanceKPI label="Net Position" value={`GHS ${stats.net.toFixed(2)}`} icon={<Calculator size={24}/>} color="blue" />
        </>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- RECENT LEDGER ENTRIES --- */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
             <Receipt size={16} className="text-primary" /> Recent Ledger Activity
          </h3>

          <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden divide-y">
            {recentTransactions?.map((tx) => (
              <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-muted/50 transition-all">
                <div className="flex items-center gap-5">
                   <div className={`p-3 rounded-2xl bg-green-50 text-green-600`}>
                      <ArrowDownCircle size={20}/>
                   </div>
                   <div>
                      <p className="font-black uppercase text-sm">{tx.patientName || 'Medical Service'}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tx.paymentMode} • Ref: {tx.paymentId}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className={`font-black text-lg text-green-600`}>
                      + GHS {tx.totalAmount?.toFixed(2)}
                   </p>
                   <p className="text-[9px] font-bold text-muted-foreground/50 uppercase italic">Authorized</p>
                </div>
              </div>
            ))}
             {!arePaymentsLoading && recentTransactions?.length === 0 && (
                <div className="p-10 text-center text-muted-foreground italic">No transactions recorded yet.</div>
             )}
          </div>
        </div>

        {/* --- SIDEBAR: ASSET ALLOCATION --- */}
        <div className="space-y-6">
           <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
              <Landmark size={16} className="text-primary" /> Fund Allocation
           </h3>
           
           <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl space-y-6 border-b-8 border-primary">
              <div className="space-y-4">
                {isLoading ? <Loader2 className="animate-spin text-white" /> : (
                  <>
                    <VaultItem label="Main Vault (Cash)" amount={fundAllocation.cash.toFixed(2)} icon={<Banknote size={14}/>} />
                    <VaultItem label="MoMo Aggregator" amount={fundAllocation.momo.toFixed(2)} icon={<CreditCard size={14}/>} />
                    <VaultItem label="NHIS Receivables" amount={fundAllocation.nhis.toFixed(2)} icon={<ShieldCheck size={14}/>} />
                  </>
                )}
              </div>
              <Button className="w-full bg-primary hover:bg-blue-700 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                 Initiate Bank Deposit
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}

function FinanceKPI({ label, value, icon, color }: any) {
  const colors: any = {
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };
  return (
    <div className={`p-8 rounded-[32px] border-2 flex items-center justify-between transition-all hover:scale-105 shadow-sm ${colors[color]}`}>
       <div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-3xl font-black tracking-tighter">{value}</p>
       </div>
       <div className="p-4 bg-white rounded-3xl shadow-sm">{icon}</div>
    </div>
  );
}

function VaultItem({ label, amount, icon }: any) {
  return (
    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
       <div className="flex items-center gap-2">
          <div className="text-blue-400">{icon}</div>
          <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
       </div>
       <span className="font-black text-sm text-white">GHS {amount}</span>
    </div>
  );
}
