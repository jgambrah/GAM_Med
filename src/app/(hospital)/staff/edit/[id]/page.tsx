'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { 
  Save, ArrowLeft, ShieldAlert, BadgeCheck, 
  Contact, Briefcase, UserCircle, Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { HOSPITAL_ROLES } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditStaffProfile() {
  const { id } = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const docRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, "users", id as string);
  }, [firestore, id]);

  const { data: staffData, isLoading: staffLoading } = useDoc(docRef);

  useEffect(() => {
    if (staffData) {
      setForm(staffData);
    }
  }, [staffData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docRef) return;

    setSaving(true);
    try {
      await updateDocumentNonBlocking(docRef, {
        ...form,
        updatedAt: serverTimestamp(),
        onboardingComplete: !!(form.licenseNumber && form.ghanaCardId)
      });
      toast({ title: "Profile Synchronized Successfully" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
    setSaving(false);
  };

  const isLoading = staffLoading || !form;

  if (isLoading) {
      return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <div className="flex items-center gap-6 bg-muted p-8 rounded-[40px]">
                <Skeleton className="w-20 h-20 rounded-3xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Skeleton className="h-64 w-full rounded-[32px]" />
                </div>
                <div className="space-y-8">
                    <Skeleton className="h-80 w-full rounded-[32px]" />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <Button onClick={() => router.back()} variant="ghost" className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold text-xs uppercase transition-all">
          <ArrowLeft size={16} /> Back to Register
        </Button>
        
        <div className="flex items-center gap-4">
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${form.is_active ? 'bg-green-100/50 border-green-200 text-green-700' : 'bg-red-100/50 border-red-200 text-red-700'}`}>
            {form.is_active ? 'System Access: Active' : 'System Access: Suspended'}
          </div>
          <Button 
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setForm({...form, is_active: !form.is_active})}
            className={`transition-all ${form.is_active ? 'hover:bg-destructive/10 text-destructive' : 'hover:bg-green-100/50 text-green-600'}`}
            title="Toggle Account Access"
          >
            <ShieldAlert size={20} />
          </Button>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-8">
        <div className="flex items-center gap-6 bg-foreground text-background p-8 rounded-[40px] shadow-2xl">
           <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-3xl font-black">
              {form.fullName?.[0]}
           </div>
           <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">{form.fullName}</h1>
              <p className="text-primary/70 font-bold uppercase text-xs tracking-widest">{form.role} • {form.email}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-4">
                <UserCircle size={16} className="text-primary" /> Bio-Data & Primary Contact
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <EditField label="Full Name" value={form.fullName} onChange={(v: string) => setForm({...form, fullName: v})} />
                <EditField label="Phone Number" value={form.phoneNumber} onChange={(v: string) => setForm({...form, phoneNumber: v})} />
                <EditField label="Residential Address" value={form.residentialAddress} onChange={(v: string) => setForm({...form, residentialAddress: v})} />
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gender</label>
                  <select className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50"
                    value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-4">
                <Contact size={16} className="text-green-600" /> Emergency & Next of Kin
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <EditField label="NOK Name" value={form.nokName} onChange={(v: string) => setForm({...form, nokName: v})} />
                <EditField label="NOK Phone" value={form.nokPhone} onChange={(v: string) => setForm({...form, nokPhone: v})} />
              </div>
            </div>
          </div>

          <div className="space-y-8 text-black">
            <div className="bg-card p-8 rounded-[32px] border shadow-sm space-y-6">
              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b pb-4">
                <Briefcase size={16} className="text-purple-600" /> Clinical Credentials
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Employee Role</label>
                  <select className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-primary/10 border-primary/20"
                    value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    {HOSPITAL_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <EditField label="License (MDC/NMC)" value={form.licenseNumber} onChange={(v: string) => setForm({...form, licenseNumber: v})} />
                <EditField label="License Expiry Date" type="date" value={form.licenseExpiry} onChange={(v: string) => setForm({...form, licenseExpiry: v})} />
                <EditField label="Ghana Card ID" value={form.ghanaCardId} onChange={(v: string) => setForm({...form, ghanaCardId: v})} />
                <EditField label="Department" value={form.department} onChange={(v: string) => setForm({...form, department: v})} />
              </div>
            </div>

            <Button 
              type="submit" disabled={saving}
              className="w-full bg-primary hover:bg-foreground text-primary-foreground font-black py-5 rounded-[24px] shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              Commit Profile Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function EditField({ label, value, type="text" }: any) {
  return (
    <div>
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</label>
      <input 
        type={type} value={value || ''}
        className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50 focus:bg-card focus:ring-2 focus:ring-primary outline-none transition-all"
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
