
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, serverTimestamp, query, collection, where } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { 
  User, Banknote, Plus, Trash2, Save, 
  Percent, ShieldCheck, Loader2, Landmark,
  Wallet, Briefcase, GraduationCap, X, ChevronsUpDown, Check, Scissors, Layers
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


export default function StaffSalaryProfile() {
  const { staffId } = useParams();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const staffDocRef = useMemoFirebase(() => firestore && staffId ? doc(firestore, "users", staffId as string) : null, [firestore, staffId]);
  const { data: staffInfo } = useDoc(staffDocRef);

  const profileDocRef = useMemoFirebase(() => firestore && staffId && userProfile?.hospitalId ? doc(firestore, `hospitals/${userProfile.hospitalId}/salary_profiles`, staffId as string) : null, [firestore, staffId, userProfile]);
  const { data: salaryProfile, isLoading: isProfileLoading } = useDoc(profileDocRef);
  
  const payrollItemsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.hospitalId) return null;
    return query(collection(firestore, `hospitals/${userProfile.hospitalId}/payroll_items`));
  }, [firestore, userProfile]);
  const { data: payrollItems } = useCollection(payrollItemsQuery);
  
  const gradesQuery = useMemoFirebase(() => {
      if(!firestore || !userProfile?.hospitalId) return null;
      return query(collection(firestore, `hospitals/${userProfile.hospitalId}/salary_grades`));
  }, [firestore, userProfile]);
  const { data: grades } = useCollection(gradesQuery);

  const availableAllowances = useMemo(() => payrollItems?.filter(i => i.type === 'ALLOWANCE') || [], [payrollItems]);
  const availableDeductions = useMemo(() => payrollItems?.filter(i => i.type === 'DEDUCTION') || [], [payrollItems]);

  const [gradeId, setGradeId] = useState('');
  const [basicSalary, setBasicSalary] = useState(0);
  const [level, setLevel] = useState('');
  const [allowances, setAllowances] = useState<{label: string, amount: number, isTaxable: boolean}[]>([]);
  const [deductions, setDeductions] = useState<{label: string, amount: number, category: string}[]>([]);

  useEffect(() => {
    if (salaryProfile) {
      setGradeId(salaryProfile.gradeId || '');
      setBasicSalary(salaryProfile.basicSalary || 0);
      setLevel(salaryProfile.level || '');
      setAllowances(salaryProfile.allowances || []);
      setDeductions(salaryProfile.deductions || []);
    }
    if (!isProfileLoading) {
        setLoading(false);
    }
  }, [salaryProfile, isProfileLoading]);

  const addAllowance = (item: any) => {
    if (!allowances.some(a => a.label === item.label)) {
      setAllowances([...allowances, { label: item.label, isTaxable: item.isTaxable, amount: 0 }]);
    }
  };

  const removeAllowance = (index: number) => setAllowances(allowances.filter((_, i) => i !== index));

  const addDeduction = (item: any) => {
    if (!deductions.some(d => d.label === item.label)) {
      setDeductions([...deductions, { label: item.label, category: item.category || 'Other', amount: 0 }]);
    }
  };
  const removeDeduction = (index: number) => setDeductions(deductions.filter((_, i) => i !== index));

  const handleSaveProfile = async () => {
    if (!profileDocRef || !userProfile) return;
    setSaving(true);
    try {
      setDocumentNonBlocking(profileDocRef, {
        staffId,
        hospitalId: userProfile.hospitalId,
        gradeId,
        basicSalary,
        level,
        allowances,
        deductions,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });
      toast({ title: "Salary Profile Synchronized" });
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message });
    } finally {
      setSaving(false);
    }
  };

  const totalAllowances = allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const grossSalary = (Number(basicSalary) || 0) + totalAllowances;

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-primary uppercase italic">Loading Compensation Profile...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-2xl font-black italic">
              {staffInfo?.fullName?.[0]}
           </div>
           <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">{staffInfo?.fullName}</h1>
              <p className="text-primary/70 font-bold uppercase text-[10px] tracking-widest">{staffInfo?.role} • {staffInfo?.email}</p>
           </div>
        </div>
        <Button onClick={handleSaveProfile} disabled={saving} className="bg-white text-black px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 hover:bg-primary hover:text-white transition-all">
          {saving ? <Loader2 className="animate-spin" /> : <Save size={18}/>} Commit Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-8 rounded-[40px] border-2 border-border shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground border-b pb-3 flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" /> Standardized Grade Assignment
          </h3>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-muted-foreground">Select Grade Level</label>
            <Select 
              value={gradeId} 
              onValueChange={(value) => {
                const grade = grades?.find(g => g.id === value);
                if (grade) {
                    setGradeId(value);
                    setBasicSalary(grade.basicSalary || 0);
                    setLevel(`${grade.name} - ${grade.level}`);
                }
            }}>
                <SelectTrigger className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-black font-black uppercase italic outline-none focus:border-blue-600 transition-all">
                    <SelectValue placeholder="Choose from Hospital Scale..." />
                </SelectTrigger>
                <SelectContent>
                    {grades?.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.name} (L{g.level}) — ₵ {g.basicSalary}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="mt-4 p-6 bg-primary/5 rounded-3xl border border-primary/10">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest">Authorized Basic Pay</span>
                  <span className="text-2xl font-black text-foreground">₵ {basicSalary.toLocaleString()}</span>
               </div>
            </div>
            <div className="mt-4 p-6 bg-green-50 rounded-3xl border border-green-100">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">Calculated Gross Salary</span>
                  <span className="text-2xl font-black text-green-900">₵ {grossSalary.toLocaleString()}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[40px] border-2 border-border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Plus size={16} className="text-green-600" /> Additional Allowances
             </h3>
             <PayrollItemSelector items={availableAllowances} onSelect={addAllowance} />
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {allowances.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center animate-in fade-in duration-200">
                <Input value={item.label} readOnly className="flex-1 text-xs uppercase font-black bg-muted/30" />
                <Input type="number" placeholder="₵" className="w-24 p-3 rounded-xl text-xs font-black text-right" value={item.amount} onChange={e => {
                  const up = [...allowances]; up[idx].amount = Number(e.target.value); setAllowances(up);
                }} />
                <Button variant="ghost" size="icon" onClick={() => removeAllowance(idx)} className="text-destructive p-2 h-9 w-9"><Trash2 size={16}/></Button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-card p-8 rounded-[40px] border-2 border-border shadow-sm space-y-6 lg:col-span-2">
           <div className="flex justify-between items-center border-b pb-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Scissors size={16} className="text-destructive" /> Voluntary & Institutional Deductions
             </h3>
             <PayrollItemSelector items={availableDeductions} onSelect={addDeduction} itemType="Deduction" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deductions.map((item, idx) => {
              const registryItem = availableDeductions.find(r => r.label === item.label);
              return (
              <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase">{item.label}</p>
                  <p className="text-[9px] text-destructive/80 font-bold">{item.category}</p>
                </div>
                <Input type="number" placeholder="₵" className="w-28 bg-background p-2 rounded-lg text-xs font-black text-right text-destructive" value={item.amount} onChange={e => {
                   const up = [...deductions]; up[idx].amount = Number(e.target.value); setDeductions(up);
                }} />
                <Button variant="ghost" size="icon" onClick={() => removeDeduction(idx)} className="text-muted-foreground hover:text-destructive h-8 w-8"><X size={16}/></Button>
              </div>
            )})}
          </div>
           {deductions.length === 0 && (
            <p className="p-10 text-center text-muted-foreground italic text-xs uppercase font-bold">No voluntary deductions applied.</p>
          )}
        </div>

      </div>
    </div>
  );
}


function PayrollItemSelector({ items, onSelect, itemType = "Allowance" }: {items: any[], onSelect: (item: any) => void, itemType?: string}) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                 <Button variant="ghost" className="text-[10px] font-black text-primary uppercase h-auto p-0 hover:bg-transparent">
                    + Add {itemType}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                 <Command>
                    <CommandInput placeholder={`Search ${itemType.toLowerCase()}...`}/>
                    <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                            {items.map(item => (
                                <CommandItem
                                    key={item.id}
                                    value={item.label}
                                    onSelect={() => {
                                        onSelect(item);
                                        setOpen(false);
                                    }}
                                >
                                  {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                 </Command>
            </PopoverContent>
        </Popover>
    )
}
