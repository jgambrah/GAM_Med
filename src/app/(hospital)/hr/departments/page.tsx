
'use client';
import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { LayoutGrid, Plus, Trash2, ShieldCheck, Landmark, Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HOSPITAL_DEPARTMENTS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function DepartmentManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [newDept, setNewDept] = useState('');
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = userProfile?.role === 'DIRECTOR' || userProfile?.role === 'HR_MANAGER' || userProfile?.role === 'ADMIN';

  const deptsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "custom_departments"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: customDepts, isLoading: areDeptsLoading } = useCollection(deptsQuery);

  const addDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept || !hospitalId) return;
    setLoading(true);
    try {
      await addDocumentNonBlocking(collection(firestore, "custom_departments"), {
        name: newDept,
        hospitalId: hospitalId,
        createdAt: serverTimestamp(),
      });
      setNewDept('');
      toast({ title: "Custom Department Added" });
    } catch (e: any) { toast({ variant: 'destructive', title: e.message }); }
    finally { setLoading(false); }
  };

  const deleteDepartment = (deptId: string) => {
    if (!firestore) return;
    deleteDoc(doc(firestore, "custom_departments", deptId));
    toast({ title: 'Department removed' });
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="animate-spin h-16 w-16" /></div>;
  
  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You are not authorized for Department Management.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 text-black font-bold">
      <h1 className="text-4xl font-black uppercase tracking-tighter italic">Department <span className="text-primary">Manager</span></h1>
      
      <form onSubmit={addDept} className="flex gap-4 bg-card p-6 rounded-[32px] border shadow-sm">
        <Input 
          placeholder="Enter New Department Name (e.g. Oncology)..." 
          className="flex-1 p-4 border rounded-2xl bg-muted text-card-foreground font-bold"
          value={newDept} onChange={e => setNewDept(e.target.value)}
        />
        <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-8 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-foreground transition-all">
          {loading ? <Loader2 className="animate-spin" /> : 'Add Department'}
        </Button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-2">
            <Landmark size={14}/> System Standards
          </h3>
          <div className="bg-muted rounded-[32px] p-6 space-y-2 opacity-60">
            {HOSPITAL_DEPARTMENTS.map(d => (
              <div key={d} className="p-3 bg-background rounded-xl text-xs uppercase font-black border">{d}</div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary px-2 flex items-center gap-2">
            <ShieldCheck size={14}/> Custom Facility Units
          </h3>
          <div className="space-y-2">
            {areDeptsLoading ? <Loader2 className="animate-spin text-primary" /> :
            customDepts?.map(d => (
              <div key={d.id} className="p-4 bg-card rounded-2xl border-2 border-primary/10 shadow-sm flex justify-between items-center group">
                <span className="text-xs font-black uppercase">{d.name}</span>
                <button onClick={() => deleteDepartment(d.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={16}/>
                </button>
              </div>
            ))}
             {!areDeptsLoading && customDepts?.length === 0 && <p className="text-muted-foreground text-center italic text-xs py-4">No custom departments added yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
