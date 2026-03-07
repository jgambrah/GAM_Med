
'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { 
  User, Banknote, Plus, Trash2, Save, 
  Percent, ShieldCheck, Loader2, Landmark,
  Wallet, Briefcase, GraduationCap, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const [basicSalary, setBasicSalary] = useState(0);
  const [level, setLevel] = useState('');
  const [allowances, setAllowances] = useState<{label: string, amount: number, isTaxable: boolean}[]>([]);
  const [deductions, setDeductions] = useState<{label: string, amount: number, category: string}[]>([]);

  useEffect(() => {
    if (salaryProfile) {
      setBasicSalary(salaryProfile.basicSalary || 0);
      setLevel(salaryProfile.level || '');
      setAllowances(salaryProfile.allowances || []);
      setDeductions(salaryProfile.deductions || []);
    }
    if (!isProfileLoading) {
        setLoading(false);
    }
  }, [salaryProfile, isProfileLoading]);

  const addAllowance = () => setAllowances([...allowances, { label: '', amount: 0, isTaxable: true }]);
  const removeAllowance = (index: number) => setAllowances(allowances.filter((_, i) => i !== index));

  const addDeduction = () => setDeductions([...deductions, { label: '', amount: 0, category: 'Other' }]);
  const removeDeduction = (index: number) => setDeductions(deductions.filter((_, i) => i !== index));

  const handleSaveProfile = async () => {
    if (!profileDocRef || !userProfile) return;
    setSaving(true);
    try {
      setDocumentNonBlocking(profileDocRef, {
        staffId,
        hospitalId: userProfile.hospitalId,
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
            <GraduationCap size={16} className="text-primary" /> Grade & Basic Pay
          </h3>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground">Salary Level/Grade</label>
                <Input className="w-full mt-1 font-black" placeholder="e.g. Senior MO 1" value={level} onChange={e => setLevel(e.target.value)} />
             </div>
             <div>
                <label className="text-[10px] font-black uppercase text-muted-foreground">Basic Salary (GHS)</label>
                <Input type="number" className="w-full mt-1 font-black text-xl" value={basicSalary} onChange={e => setBasicSalary(Number(e.target.value))} />
             </div>
          </div>
          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex justify-between items-center">
             <span className="text-[10px] font-black uppercase text-primary tracking-widest">Calculated Gross</span>
             <span className="text-2xl font-black text-foreground">₵ {grossSalary.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-card p-8 rounded-[40px] border-2 border-border shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <Plus size={16} className="text-green-600" /> Additional Allowances
             </h3>
             <Button onClick={addAllowance} variant="ghost" className="text-[10px] font-black text-primary uppercase h-auto p-0 hover:bg-transparent">
                + Add Line
            </Button>
          </div>
          <div className="space-y-3">
            {allowances.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center animate-in fade-in duration-200">
                <Input placeholder="Label (e.g. Risk)" className="flex-1 p-3 bg-muted rounded-xl text-xs" value={item.label} onChange={e => {
                  const up = [...allowances]; up[idx].label = e.target.value; setAllowances(up);
                }} />
                <Input type="number" placeholder="₵" className="w-24 p-3 bg-muted rounded-xl text-xs font-black text-right" value={item.amount} onChange={e => {
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
               <Trash2 size={16} className="text-destructive" /> Voluntary & Loan Deductions
             </h3>
             <Button onClick={addDeduction} variant="ghost" className="text-[10px] font-black text-destructive uppercase h-auto p-0 hover:bg-transparent">+ Add Deduction</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deductions.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-muted p-4 rounded-2xl border">
                <Select value={item.category} onValueChange={value => {
                   const up = [...deductions]; up[idx].category = value; setDeductions(up);
                }}>
                    <SelectTrigger className="bg-card w-auto text-[10px] font-black uppercase">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Loan">Loan</SelectItem>
                        <SelectItem value="Union">Union</SelectItem>
                        <SelectItem value="Welfare">Welfare</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Description (e.g. GRNMA Dues)" className="flex-1 bg-transparent text-xs font-bold outline-none border-0" value={item.label} onChange={e => {
                   const up = [...deductions]; up[idx].label = e.target.value; setDeductions(up);
                }} />
                <Input type="number" className="w-28 bg-card p-2 rounded-lg text-xs font-black text-right text-destructive" value={item.amount} onChange={e => {
                   const up = [...deductions]; up[idx].amount = Number(e.target.value); setDeductions(up);
                }} />
                <Button variant="ghost" size="icon" onClick={() => removeDeduction(idx)} className="text-muted-foreground hover:text-destructive h-8 w-8"><X size={16}/></Button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
