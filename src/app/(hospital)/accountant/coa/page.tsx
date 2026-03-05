'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, orderBy, doc } from 'firebase/firestore';
import { 
  Plus, FolderTree, Landmark, Wallet, 
  ArrowRight, Layers, PieChart, Save, X, ChevronDown, ChevronRight, Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';


const accountSchema = z.object({
  name: z.string().min(1, "Account name is required."),
  category: z.string().min(1, "Category is required."),
  accountCode: z.string().min(1, "Account code is required."),
  parentAccountId: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountSchema>;


export default function ChartOfAccounts() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userRole);

  const accountsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`),
      orderBy("accountCode", "asc")
    );
  }, [firestore, hospitalId]);

  const { data: accounts, isLoading: areAccountsLoading } = useCollection(accountsQuery);
  
  const categories = ['ASSETS', 'LIABILITIES', 'REVENUE', 'EXPENSES', 'CAPITAL'];
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
          <p className="text-muted-foreground">You are not authorized for the Chart of Accounts.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Chart of <span className="text-primary">Accounts</span></h1>
          <p className="text-muted-foreground font-bold text-xs uppercase italic">Organize facility assets, liabilities, and equity.</p>
        </div>
        <AddAccountDialog 
            hospitalId={hospitalId}
            accounts={accounts || []}
            isOpen={isAddAccountOpen}
            setIsOpen={setIsAddAccountOpen}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {areAccountsLoading && <Loader2 className="animate-spin text-primary mx-auto" />}
        {categories.map(cat => {
          const catAccounts = accounts?.filter(a => a.category === cat && !a.parentAccountId) || [];
          return (
            <div key={cat} className="bg-card rounded-[40px] border shadow-sm overflow-hidden">
               <div className="bg-foreground p-6 text-background flex justify-between items-center">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em]">{cat}</h3>
                  <PieChart size={18} className="text-primary opacity-50" />
               </div>
               
               <div className="divide-y">
                  {catAccounts.length === 0 && <div className="p-10 text-center text-muted-foreground italic text-xs uppercase font-bold">No {cat} accounts defined.</div>}
                  {catAccounts.map(parent => (
                    <div key={parent.id} className="group">
                      <div className="p-6 flex justify-between items-center hover:bg-muted/50 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="text-primary font-black text-xs w-12">{parent.accountCode}</div>
                           <p className="font-black text-card-foreground uppercase text-sm">{parent.name}</p>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">₵ {parent.currentBalance.toFixed(2)}</span>
                      </div>
                      
                      {accounts?.filter(sub => sub.parentAccountId === parent.id).map(sub => (
                        <div key={sub.id} className="pl-16 pr-6 py-4 bg-muted/50 flex justify-between items-center border-l-4 border-primary/20">
                          <div className="flex items-center gap-3">
                             <ArrowRight size={14} className="text-primary/50" />
                             <div className="text-muted-foreground font-bold text-[10px] w-10">{sub.accountCode}</div>
                             <p className="font-bold text-foreground/80 uppercase text-xs">{sub.name}</p>
                          </div>
                          <span className="text-[11px] font-black text-primary italic">₵ {sub.currentBalance.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const AddAccountDialog = ({ hospitalId, accounts, isOpen, setIsOpen }: any) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [category, setCategory] = useState('ASSETS');

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountSchema),
        defaultValues: { 
            name: '',
            accountCode: '',
            category: 'ASSETS',
            parentAccountId: '' 
        },
    });

    const onSubmit = (values: AccountFormValues) => {
        if (!firestore) return;
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/chart_of_accounts`), {
            ...values,
            hospitalId: hospitalId,
            currentBalance: 0,
            createdAt: serverTimestamp()
        });
        toast({ title: "Account created successfully" });
        setIsOpen(false);
        form.reset();
    };

    const potentialParents = accounts.filter((a: any) => a.category === form.watch('category') && !a.parentAccountId);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><Plus size={18} /> New Account</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase text-foreground italic">Setup Account</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="category" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="ASSETS">ASSETS</SelectItem>
                                        <SelectItem value="LIABILITIES">LIABILITIES</SelectItem>
                                        <SelectItem value="REVENUE">REVENUE</SelectItem>
                                        <SelectItem value="EXPENSES">EXPENSES</SelectItem>
                                        <SelectItem value="CAPITAL">CAPITAL</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Account Name</FormLabel><FormControl><Input placeholder="e.g., GCB Operations Account" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="accountCode" render={({ field }) => (
                            <FormItem><FormLabel>Account Code</FormLabel><FormControl><Input placeholder="e.g., 1001" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="parentAccountId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parent Account (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="None (Top Level)" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {potentialParents.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="animate-spin"/> : 'Save Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
