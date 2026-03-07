'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Layers, Plus, Save, Trash2, Banknote, ShieldCheck, Loader2, ShieldAlert, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const gradeSchema = z.object({
  name: z.string().min(3, "Grade name is required"),
  level: z.string().min(1, "Level is required"),
  basicSalary: z.coerce.number().min(1, "Basic Salary must be greater than zero"),
});
type GradeFormValues = z.infer<typeof gradeSchema>;


export default function SalaryGradeManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'HR_MANAGER', 'ADMIN'].includes(userProfile?.role || '');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any | null>(null);

  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/salary_grades`), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: grades, isLoading: areGradesLoading } = useCollection(gradesQuery);

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { name: '', level: '1', basicSalary: 0 },
  });

  useEffect(() => {
    if (editingGrade) {
      form.reset(editingGrade);
    } else {
      form.reset({ name: '', level: '1', basicSalary: 0 });
    }
  }, [editingGrade, form]);


  const saveGrade = async (values: GradeFormValues) => {
    if (!firestore || !hospitalId) return;

    if (editingGrade) {
      const gradeRef = doc(firestore, `hospitals/${hospitalId}/salary_grades`, editingGrade.id);
      updateDocumentNonBlocking(gradeRef, {
        ...values,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Salary Grade Updated" });
    } else {
      addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/salary_grades`), {
        ...values,
        hospitalId: hospitalId,
        createdAt: serverTimestamp()
      });
      toast({ title: "Salary Grade Added to Scale" });
    }
    
    setIsDialogOpen(false);
    setEditingGrade(null);
    form.reset();
  };
  
  const deleteGrade = (gradeId: string) => {
    if (!firestore || !hospitalId) return;
    const confirmation = confirm("Are you sure you want to delete this salary grade? This action cannot be undone.");
    if (confirmation) {
      deleteDocumentNonBlocking(doc(firestore, `hospitals/${hospitalId}/salary_grades`, gradeId));
      toast({ title: 'Grade removed from scale.' });
    }
  }

  const isLoading = isUserLoading || isProfileLoading;
  
  if (isLoading) {
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
                <p className="text-muted-foreground">You do not have clearance for this module.</p>
                <Button onClick={() => router.push('/dashboard')}>Return Home</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 text-black font-bold">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic text-black">Salary <span className="text-primary">Scale Registry</span></h1>
          <p className="text-slate-500 font-bold text-xs uppercase italic">Define standardized Grade Levels and Basic Salaries.</p>
        </div>
        <Button onClick={() => { setEditingGrade(null); setIsDialogOpen(true); }}>
            <Plus size={16} /> New Grade
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGrade ? 'Edit Salary Grade' : 'Setup New Salary Grade'}</DialogTitle>
            </DialogHeader>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(saveGrade)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({field}) => <FormItem><FormLabel>Grade Name (e.g. Senior Medical Officer)</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>} />
                   <div className="grid grid-cols-2 gap-4">
                       <FormField control={form.control} name="level" render={({field}) => <FormItem><FormLabel>Step / Level</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>} />
                       <FormField control={form.control} name="basicSalary" render={({field}) => <FormItem><FormLabel>Basic Salary (₵)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>} />
                   </div>
                   <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                         {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : 'Commit to Registry'}
                      </Button>
                   </DialogFooter>
                </form>
             </Form>
          </DialogContent>
        </Dialog>

      <div className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-foreground text-primary-foreground text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="p-6">Grade Name</th>
              <th className="p-6">Step / Level</th>
              <th className="p-6 text-right">Basic Salary (₵)</th>
              <th className="p-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {areGradesLoading ? (
                 <tr><td colSpan={4} className="p-20 text-center"><Loader2 className="animate-spin"/></td></tr>
            ) : grades?.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-muted-foreground italic uppercase text-xs">No salary grades defined.</td></tr>
            ) : grades?.map(g => (
              <tr key={g.id} className="hover:bg-primary/5 transition-all font-bold">
                <td className="p-6 uppercase text-sm">{g.name}</td>
                <td className="p-6">
                   <span className="bg-muted px-4 py-1 rounded-full text-[10px]">Level {g.level}</span>
                </td>
                <td className="p-6 text-right text-lg font-black italic">₵ {g.basicSalary.toLocaleString()}</td>
                <td className="p-6 text-right">
                   <Button variant="ghost" size="icon" onClick={() => { setEditingGrade(g); setIsDialogOpen(true); }}>
                      <Edit size={16}/>
                   </Button>
                   <Button variant="ghost" size="icon" onClick={() => deleteGrade(g.id)} className="text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 size={16}/>
                   </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
