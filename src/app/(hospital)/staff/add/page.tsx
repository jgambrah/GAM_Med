
'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebaseApp, useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { HOSPITAL_ROLES } from '@/lib/roles';
import { HOSPITAL_DEPARTMENTS } from '@/lib/constants';
import { collection, query, where, doc } from 'firebase/firestore';
import { 
  UserPlus, ShieldCheck, Contact, Briefcase, 
  Save, Loader2, AlertCircle 
} from 'lucide-react';

export default function AddStaffPage() {
  const [loading, setLoading] = useState(false);
  const firebaseApp = useFirebaseApp();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [allDepartments, setAllDepartments] = useState<string[]>(HOSPITAL_DEPARTMENTS);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;

  const deptsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "custom_departments"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: customDepts } = useCollection(deptsQuery);

  useEffect(() => {
    if (customDepts) {
      const customNames = customDepts.map(d => d.name);
      setAllDepartments([...HOSPITAL_DEPARTMENTS, ...customNames].sort());
    }
  }, [customDepts]);

  const initialFormState = {
    // REQUIRED FIELDS
    fullName: '',
    email: '',
    role: 'NURSE',
    contractType: 'PERMANENT',
    // OPTIONAL IDENTITY
    gender: '',
    dob: '',
    ghanaCardId: '',
    // OPTIONAL PROFESSIONAL
    licenseNumber: '',
    department: '',
    employeeId: '',
    // OPTIONAL CONTACT
    phoneNumber: '',
    residentialAddress: '',
  };

  const [form, setForm] = useState(initialFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseApp) {
        toast({
            variant: "destructive",
            title: "Initialization Error",
            description: "Firebase is not ready. Please try again.",
        });
        return;
    }
    setLoading(true);
    const functions = getFunctions(firebaseApp);
    const onboardStaff = httpsCallable(functions, 'onboardStaff');

    try {
      await onboardStaff(form);
      toast({
        title: "Staff Onboarded Successfully",
        description: `${form.fullName} can now log in with the default password.`
      });
      setForm(initialFormState); // Reset form
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Onboarding Failed",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tighter italic">Personnel <span className="text-foreground">Onboarding</span></h1>
          <p className="text-muted-foreground font-medium italic">Create accounts instantly; fill professional details later.</p>
        </div>
        <div className="bg-amber-100/50 border border-amber-200 p-3 rounded-xl flex items-center gap-3 text-amber-700">
           <AlertCircle size={20} />
           <span className="text-xs font-bold uppercase">Default Password: Staff123!</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: CORE CREDENTIALS (REQUIRED) */}
        <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <ShieldCheck className="text-primary" size={18} />
            <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Core Account (Required)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Full Name" required value={form.fullName} 
              onChange={(v: string) => setForm({...form, fullName: v})} />
            <InputField label="Work Email" required type="email" value={form.email} 
              onChange={(v: string) => setForm({...form, email: v})} />
            
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase">Assigned Role</label>
              <select className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50"
                value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                {HOSPITAL_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase">Contract Type</label>
              <select className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50"
                value={form.contractType} onChange={e => setForm({...form, contractType: e.target.value})}>
                <option value="PERMANENT">Permanent Staff</option>
                <option value="LOCUM">Locum / Contractor</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: PROFESSIONAL & IDENTITY (OPTIONAL) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Briefcase className="text-primary" size={18} />
              <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Professional Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="License Number (MDC/NMC)" value={form.licenseNumber} onChange={(v: string) => setForm({...form, licenseNumber: v})} />
              <InputField label="Employee ID" value={form.employeeId} onChange={(v: string) => setForm({...form, employeeId: v})} />
              
              <div className="col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase">Department</label>
                  <select 
                    required 
                    className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50 focus:bg-card focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={form.department}
                    onChange={e => setForm({...form, department: e.target.value})}
                  >
                    <option value="">Select Department...</option>
                    {allDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase">Gender</label>
                <select className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50"
                    value={form.gender}
                    onChange={e => setForm({...form, gender: e.target.value})}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Contact className="text-primary" size={18} />
              <h3 className="font-bold text-sm uppercase tracking-widest text-foreground">Contact & ID</h3>
            </div>
            <div className="space-y-4">
              <InputField label="Phone Number" value={form.phoneNumber} onChange={(v: string) => setForm({...form, phoneNumber: v})} />
              <InputField label="Ghana Card ID (GHA-XXX)" value={form.ghanaCardId} onChange={(v: string) => setForm({...form, ghanaCardId: v})} />
              <InputField label="Residential Address" value={form.residentialAddress} onChange={(v: string) => setForm({...form, residentialAddress: v})} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:bg-foreground transition shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          Finalize Onboarding
        </button>
      </form>
    </div>
  );
}

function InputField({ label, type = "text", required = false, value, onChange }: any) {
  return (
    <div>
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        type={type} required={required} value={value}
        className="w-full p-3 border rounded-xl mt-1 text-card-foreground font-bold bg-muted/50 focus:bg-card focus:ring-2 focus:ring-primary outline-none transition-all"
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
    