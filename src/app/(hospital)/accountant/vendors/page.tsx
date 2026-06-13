'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Building2, Plus, Phone, Mail, Globe, 
  Trash2, Edit, Save, Loader2, ShieldAlert, FileText, CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function VendorManager() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    tin: '',
    phone: '',
    email: '',
    bankName: '',
    accountNumber: '',
    defaultWhtRate: 5.5,
    defaultVatRate: 21.9,
  });

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'ADMIN', 'ACCOUNTANT'].includes(userProfile?.role || '');

  const vendorsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/vendors`));
  }, [firestore, hospitalId]);
  const { data: vendors, isLoading: isVendorsLoading } = useCollection(vendorsQuery);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !hospitalId) return;

    setSaving(true);
    try {
      if (editingId) {
        // Edit existing vendor
        const vendorRef = doc(firestore, `hospitals/${hospitalId}/vendors`, editingId);
        await updateDoc(vendorRef, {
          name: form.name.trim(),
          tin: form.tin.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          defaultWhtRate: Number(form.defaultWhtRate) || 0,
          defaultVatRate: Number(form.defaultVatRate) || 0,
        });
        toast({ title: "Vendor Updated", description: `${form.name} profile has been saved.` });
      } else {
        // Create new vendor
        const vendorsRef = collection(firestore, `hospitals/${hospitalId}/vendors`);
        await addDoc(vendorsRef, {
          name: form.name.trim(),
          tin: form.tin.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          defaultWhtRate: Number(form.defaultWhtRate) || 0,
          defaultVatRate: Number(form.defaultVatRate) || 0,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Vendor Registered", description: `${form.name} is now available for payouts.` });
      }

      setForm({
        name: '',
        tin: '',
        phone: '',
        email: '',
        bankName: '',
        accountNumber: '',
        defaultWhtRate: 5.5,
        defaultVatRate: 21.9,
      });
      setEditingId(null);
    } catch (error: any) {
      console.error("Error saving vendor:", error);
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || '',
      tin: vendor.tin || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      bankName: vendor.bankName || '',
      accountNumber: vendor.accountNumber || '',
      defaultWhtRate: vendor.defaultWhtRate ?? 5.5,
      defaultVatRate: vendor.defaultVatRate ?? 21.9,
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete vendor: "${name}"?`)) return;
    if (!firestore || !hospitalId) return;

    try {
      await deleteDoc(doc(firestore, `hospitals/${hospitalId}/vendors`, id));
      toast({ title: "Vendor Deleted", description: `Removed vendor profile for ${name}.` });
      if (editingId === id) {
        setEditingId(null);
        setForm({
          name: '',
          tin: '',
          phone: '',
          email: '',
          bankName: '',
          accountNumber: '',
          defaultWhtRate: 5.5,
          defaultVatRate: 21.9,
        });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Delete Failed", description: e.message });
    }
  };

  const pageIsLoading = isUserLoading || isProfileLoading;
  
  if (pageIsLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-50"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white p-10 rounded-[40px] border shadow-sm max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">Only Accountants and Administrators can manage vendors.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 font-black uppercase text-xs tracking-widest rounded-2xl py-4 h-auto w-full">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 text-slate-800">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          Vendor <span className="text-primary">Registry</span>
        </h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider italic mt-1">
          Register and configure third-party suppliers, billing items, and tax rates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[40px] border shadow-sm space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-slate-900">
            <Building2 size={22} className="text-primary" /> {editingId ? 'Edit Vendor Profile' : 'New Vendor Setup'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Company / Vendor Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Acme Medical Supplies"
                className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Tax Identification Number (TIN)</label>
              <input
                required
                type="text"
                placeholder="e.g. C001234567"
                className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                value={form.tin}
                onChange={e => setForm({ ...form, tin: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Phone Number</label>
                <input
                  required
                  type="tel"
                  placeholder="e.g. +233 24 000 0000"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. sales@vendor.com"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pt-4 border-t">Settlement Bank Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Bank Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Ecobank Ghana"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                  value={form.bankName}
                  onChange={e => setForm({ ...form, bankName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Account Number</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 14410029384"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                  value={form.accountNumber}
                  onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                />
              </div>
            </div>

            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pt-4 border-t">Tax Configurations (%)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Default WHT Rate (%)</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  placeholder="5.5"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                  value={form.defaultWhtRate}
                  onChange={e => setForm({ ...form, defaultWhtRate: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Default VAT Rate (%)</label>
                <input
                  required
                  type="number"
                  step="0.1"
                  placeholder="21.9"
                  className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all text-slate-900"
                  value={form.defaultVatRate}
                  onChange={e => setForm({ ...form, defaultVatRate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 py-5 rounded-2xl h-auto font-black uppercase text-xs tracking-widest text-slate-600"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    name: '',
                    tin: '',
                    phone: '',
                    email: '',
                    bankName: '',
                    accountNumber: '',
                    defaultWhtRate: 5.5,
                    defaultVatRate: 21.9,
                  });
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="flex-[2] py-5 rounded-2xl h-auto font-black uppercase text-xs tracking-widest bg-primary hover:bg-black text-white transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />} 
              {editingId ? 'Save Changes' : 'Register Vendor'}
            </Button>
          </div>
        </form>

        {/* Vendors Directory View */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-[40px] border shadow-sm space-y-6">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-slate-900">
            <FileText size={22} className="text-primary" /> Registered Directory
          </h2>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {isVendorsLoading ? (
              <div className="py-20 text-center"><Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" /></div>
            ) : !vendors || vendors.length === 0 ? (
              <div className="p-20 text-center text-muted-foreground italic uppercase text-xs border-2 border-dashed rounded-[30px]">No vendors registered yet.</div>
            ) : (
              vendors.map(v => (
                <div key={v.id} className="p-6 bg-slate-50 border rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all text-slate-800">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900">{v.name}</h3>
                      <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">TIN: {v.tin}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-bold text-slate-500 uppercase">
                      <p>📞 {v.phone}</p>
                      <p>✉️ {v.email}</p>
                      <p className="col-span-2">🏦 {v.bankName} – <span className="font-mono text-xs text-slate-800 font-extrabold">{v.accountNumber}</span></p>
                    </div>
                    <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <span>Default WHT: <span className="text-slate-800">{v.defaultWhtRate}%</span></span>
                      <span>Default VAT: <span className="text-slate-800">{v.defaultVatRate}%</span></span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto md:shrink-0 border-t md:border-0 pt-3 md:pt-0">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 md:flex-none border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl"
                      onClick={() => handleEdit(v)}
                    >
                      <Edit size={14} className="mr-1" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 md:flex-none border-red-100 text-destructive hover:bg-red-50 hover:border-red-200 rounded-xl"
                      onClick={() => handleDelete(v.id, v.name)}
                    >
                      <Trash2 size={14} className="mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
