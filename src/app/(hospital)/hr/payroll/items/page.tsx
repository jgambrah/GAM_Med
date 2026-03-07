'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Banknote, Scissors, ShieldCheck, ListChecks, ShieldAlert, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function PayrollItemManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT', 'HR_MANAGER'].includes(userRole || '');

  const [form, setForm] = useState({ label: '', type: 'ALLOWANCE', isTaxable: true });

  const payrollItemsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/payroll_items`));
  }, [firestore, hospitalId]);
  const { data: payrollItems, isLoading: areItemsLoading } = useCollection(payrollItemsQuery);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !hospitalId) return;
    try {
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/payroll_items`), {
        ...form,
        hospitalId: hospitalId,
        createdAt: serverTimestamp()
      });
      setForm({ label: '', type: 'ALLOWANCE', isTaxable: true });
      toast({ title: "Payroll Item Standardized" });
    } catch (e: any) { toast({ variant: 'destructive', title: e.message }); }
  };
  
  const deleteItem = async (id: string) => {
      if (!firestore || !hospitalId) return;
      deleteDocumentNonBlocking(doc(firestore, `hospitals/${hospitalId}/payroll_items`, id));
      toast({title: "Item removed"});
  }

  const isLoading = isUserLoading || isProfileLoading;
  if(isLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin"/></div>

  if(!isAuthorized && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for this module.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic">Payroll <span className="text-primary">Item Registry</span></h1>
      
      {/* ADD ITEM FORM */}
      <form onSubmit={saveItem} className="bg-card p-8 rounded-[40px] border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="text-[10px] font-black text-muted-foreground uppercase">Item Name</label>
          <Input required placeholder="e.g. Risk Allowance" className="w-full mt-1" 
            value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black text-muted-foreground uppercase">Type</label>
          <Select value={form.type} onValueChange={(value) => setForm({...form, type: value})}>
            <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALLOWANCE">Allowance</SelectItem>
              <SelectItem value="DEDUCTION">Deduction</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full">Register Item</Button>
      </form>

      {/* LIST OF STANDARDIZED ITEMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ItemSection title="Standard Allowances" icon={<Banknote/>} list={payrollItems?.filter(i => i.type === 'ALLOWANCE') || []} onDelete={deleteItem} color="text-green-600" />
        <ItemSection title="Standard Deductions" icon={<Scissors/>} list={payrollItems?.filter(i => i.type === 'DEDUCTION') || []} onDelete={deleteItem} color="text-red-600" />
      </div>
    </div>
  );
}

function ItemSection({ title, icon, list, onDelete, color }: any) {
  return (
    <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b pb-2">
         <div className={color}>{icon}</div>
         <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {list.map((item: any) => (
          <div key={item.id} className="p-4 bg-muted/50 rounded-2xl flex justify-between items-center group">
            <span className="text-sm uppercase">{item.label}</span>
            <button onClick={() => onDelete(item.id)} className="text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
          </div>
        ))}
        {list.length === 0 && <p className='text-center text-xs italic text-muted-foreground pt-4'>No items defined.</p>}
      </div>
    </div>
  );
}
