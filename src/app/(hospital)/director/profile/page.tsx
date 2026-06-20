'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Building2, Phone, Mail, Globe, Palette, Save, Loader2, ShieldAlert, CheckCircle, FileText, MessageSquare, Key, HelpCircle, ExternalLink, CreditCard, MapPin, Calculator, Droplets } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 
  'Northern', 'Volta', 'Upper East', 'Upper West', 'Bono', 
  'Bono East', 'Ahafo', 'Savannah', 'North East', 'Oti', 'Western North'
];

export default function HospitalProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = userProfile?.role === 'DIRECTOR' || userProfile?.role === 'ADMIN';

  const hospitalRef = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return doc(firestore, 'hospitals', hospitalId);
  }, [firestore, hospitalId]);
  const { data: hospital, isLoading: isHospitalLoading } = useDoc(hospitalRef);

  const [activeTab, setActiveTab] = useState<'profile' | 'comms' | 'payments'>('profile');
  const [form, setForm] = useState({
    name: '',
    address: '',
    location: '',
    region: '',
    phone: '',
    email: '',
    website: '',
    primaryColor: '#0f172a',
    secondaryColor: '#2563eb',
    smsProvider: 'MOCK',
    smsApiKey: '',
    smsSenderId: '',
    emailProvider: 'MOCK',
    emailApiKey: '',
    emailFromAddress: '',
    paystackPublicKey: '',
    paystackSecretKey: '',
    latitude: '',
    longitude: '',
    diagnosticPaymentPolicy: 'NONE',
    bloodDonorBronzeBenefit: 'Verified donor health screening reports & analytics;Priority queuing at blood bank and laboratory desks',
    bloodDonorSilverBenefit: '15% discount waiver on standard blood processing fees;Priority queuing at blood bank and laboratory desks',
    bloodDonorGoldBenefit: '50% discount waiver on standard blood processing fees;Exemption from family replacement donation requirements',
    bloodDonorPlatinumBenefit: '100% full processing fee waiver for donor and immediate family;Direct VIP billing desk priority',
  });

  // Sync state once data loads
  useEffect(() => {
    if (hospital) {
      setForm({
        name: hospital.name || '',
        address: hospital.address || '',
        location: hospital.location || '',
        region: hospital.region || '',
        phone: hospital.phone || '',
        email: hospital.email || '',
        website: hospital.website || '',
        primaryColor: hospital.primaryColor || '#0f172a',
        secondaryColor: hospital.secondaryColor || '#2563eb',
        smsProvider: hospital.smsProvider || 'MOCK',
        smsApiKey: hospital.smsApiKey || '',
        smsSenderId: hospital.smsSenderId || '',
        emailProvider: hospital.emailProvider || 'MOCK',
        emailApiKey: hospital.emailApiKey || '',
        emailFromAddress: hospital.emailFromAddress || '',
        paystackPublicKey: hospital.paystackPublicKey || '',
        paystackSecretKey: hospital.paystackSecretKey || '',
        latitude: hospital.latitude !== undefined && hospital.latitude !== null ? String(hospital.latitude) : '',
        longitude: hospital.longitude !== undefined && hospital.longitude !== null ? String(hospital.longitude) : '',
        diagnosticPaymentPolicy: hospital.diagnosticPaymentPolicy || 'NONE',
        bloodDonorBronzeBenefit: hospital.bloodDonorBronzeBenefit || 'Verified donor health screening reports & analytics;Priority queuing at blood bank and laboratory desks',
        bloodDonorSilverBenefit: hospital.bloodDonorSilverBenefit || '15% discount waiver on standard blood processing fees;Priority queuing at blood bank and laboratory desks',
        bloodDonorGoldBenefit: hospital.bloodDonorGoldBenefit || '50% discount waiver on standard blood processing fees;Exemption from family replacement donation requirements',
        bloodDonorPlatinumBenefit: hospital.bloodDonorPlatinumBenefit || '100% full processing fee waiver for donor and immediate family;Direct VIP billing desk priority',
      });
    }
  }, [hospital]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Your browser does not support geolocation detection.",
      });
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(prev => ({
          ...prev,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
        setDetectingGps(false);
        toast({
          title: "Location Detected",
          description: `Set to Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
        });
      },
      (error) => {
        setDetectingGps(false);
        let msg = "Could not retrieve your current location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location access was denied. Please check your browser permissions.";
        }
        toast({
          variant: "destructive",
          title: "Detection Failed",
          description: msg,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !hospitalId || !hospitalRef) return;

    setSaving(true);
    try {
      await updateDoc(hospitalRef, {
        name: form.name.trim(),
        address: form.address.trim(),
        location: form.location.trim(),
        region: form.region,
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        smsProvider: form.smsProvider,
        smsApiKey: form.smsApiKey.trim(),
        smsSenderId: form.smsSenderId.trim(),
        emailProvider: form.emailProvider,
        emailApiKey: form.emailApiKey.trim(),
        emailFromAddress: form.emailFromAddress.trim(),
        paystackPublicKey: form.paystackPublicKey.trim(),
        paystackSecretKey: form.paystackSecretKey.trim(),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        diagnosticPaymentPolicy: form.diagnosticPaymentPolicy,
        bloodDonorBronzeBenefit: form.bloodDonorBronzeBenefit.trim(),
        bloodDonorSilverBenefit: form.bloodDonorSilverBenefit.trim(),
        bloodDonorGoldBenefit: form.bloodDonorGoldBenefit.trim(),
        bloodDonorPlatinumBenefit: form.bloodDonorPlatinumBenefit.trim(),
      });

      toast({
        title: "Profile Updated",
        description: "Your hospital's official profile and document styling has been updated.",
      });
    } catch (error: any) {
      console.error("Error updating hospital profile:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected security permission error occurred.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading || isHospitalLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white p-10 rounded-[40px] border shadow-sm max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            Only Hospital Directors and Administrators are authorized to update branding and configuration profiles.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 font-black uppercase text-xs tracking-widest rounded-2xl py-4 h-auto w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 text-slate-800">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">
          Hospital <span className="text-primary">Profile</span>
        </h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider italic mt-1">
          Configure branding, colors, contact details and documents defaults
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-white p-6 md:p-10 rounded-[40px] border shadow-sm space-y-6">
          <div className="flex gap-4 border-b pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`pb-2 px-4 font-black uppercase text-[10px] tracking-widest border-b-2 transition-all outline-none ${
                activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Hospital Identity
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comms')}
              className={`pb-2 px-4 font-black uppercase text-[10px] tracking-widest border-b-2 transition-all outline-none ${
                activeTab === 'comms' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Comms Integrations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`pb-2 px-4 font-black uppercase text-[10px] tracking-widest border-b-2 transition-all outline-none ${
                activeTab === 'payments' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-900'
              }`}
            >
              Payments
            </button>
          </div>

          {activeTab === 'profile' && (
            <>
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4">
                <Building2 size={22} className="text-primary" /> Institution Info
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Hospital / Clinic Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. GAM Medical Clinic"
                    className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Region</label>
                    <select
                      required
                      className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.region}
                      onChange={e => setForm({ ...form, region: e.target.value })}
                    >
                      <option value="">Select Region...</option>
                      {GHANA_REGIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">City / Town</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Accra"
                      className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Physical Address</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Plot 24 Ring Road Central, near GRA building"
                    className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="bg-slate-50/50 p-6 rounded-[28px] border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">GPS Geofencing Coordinates</h4>
                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">Coordinates used to restrict staff clock-ins within 200m</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={detectLocation}
                      disabled={detectingGps}
                      className="rounded-xl text-[10px] font-black uppercase tracking-wider px-3"
                    >
                      {detectingGps ? <Loader2 size={12} className="animate-spin mr-1" /> : <MapPin size={12} className="mr-1" />}
                      Detect GPS
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 5.6037"
                        className="w-full p-4 border rounded-2xl bg-white font-mono font-bold text-sm outline-none focus:border-primary transition-all"
                        value={form.latitude}
                        onChange={e => setForm({ ...form, latitude: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. -0.1870"
                        className="w-full p-4 border rounded-2xl bg-white font-mono font-bold text-sm outline-none focus:border-primary transition-all"
                        value={form.longitude}
                        onChange={e => setForm({ ...form, longitude: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pt-6 pb-4">
                  <Phone size={20} className="text-primary" /> Contacts & Social
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Official Phone Number</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Phone size={16} /></span>
                      <input
                        required
                        type="tel"
                        placeholder="e.g. +233 24 123 4567"
                        className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Official Email</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Mail size={16} /></span>
                      <input
                        required
                        type="email"
                        placeholder="e.g. contact@gammed.com"
                        className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Website URL</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Globe size={16} /></span>
                    <input
                      type="url"
                      placeholder="e.g. https://www.gammed.com"
                      className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.website}
                      onChange={e => setForm({ ...form, website: e.target.value })}
                    />
                  </div>
                </div>

                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pt-6 pb-4">
                  <Palette size={20} className="text-primary" /> Visual Identity (Theme Colors)
                </h2>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2">Primary Brand Color</label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        className="w-12 h-12 rounded-xl cursor-pointer border p-1"
                        value={form.primaryColor}
                        onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full p-3 border rounded-xl bg-slate-50 font-mono font-bold text-sm outline-none"
                        value={form.primaryColor.toUpperCase()}
                        onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2">Secondary / Accent Color</label>
                    <div className="flex gap-3 items-center">
                      <input
                        type="color"
                        className="w-12 h-12 rounded-xl cursor-pointer border p-1"
                        value={form.secondaryColor}
                        onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                      />
                      <input
                        type="text"
                        className="w-full p-3 border rounded-xl bg-slate-50 font-mono font-bold text-sm outline-none"
                        value={form.secondaryColor.toUpperCase()}
                        onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'comms' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* SMS GATEWAY SETTINGS */}
              <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-blue-600">
                  <MessageSquare size={22} /> SMS Gateway Config (Arkesel)
                </h2>

                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2 font-black text-blue-700">
                    <HelpCircle size={16} /> Setup Instructions:
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-600 font-medium">
                    <li>Create an account at the <a href="https://arkesel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Arkesel SMS Gateway <ExternalLink size={10} /></a>.</li>
                    <li>Go to your dashboard's <strong>Settings &rarr; API Keys</strong>, generate a new API key, and paste it below.</li>
                    <li>Request a custom <strong>Sender ID</strong> (max 11 chars) in the Arkesel console. Use the default <code>GamMed</code> until approved.</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">SMS Integration Mode</label>
                    <select
                      className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.smsProvider}
                      onChange={e => setForm({ ...form, smsProvider: e.target.value })}
                    >
                      <option value="MOCK">MOCK (Sandbox Mode)</option>
                      <option value="ARKESEL">ARKESEL (Production SMS)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Sender ID (e.g. Hospital Initials)</label>
                    <input
                      type="text"
                      placeholder="e.g. GamMed"
                      maxLength={11}
                      className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.smsSenderId}
                      onChange={e => setForm({ ...form, smsSenderId: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Arkesel API Key</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Key size={16} /></span>
                    <input
                      type="password"
                      placeholder="Enter Arkesel API key..."
                      className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.smsApiKey}
                      onChange={e => setForm({ ...form, smsApiKey: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* EMAIL GATEWAY SETTINGS */}
              <div className="space-y-6 pt-6">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-purple-600">
                  <Mail size={22} /> Email Gateway Config (Resend)
                </h2>

                <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 flex flex-col gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2 font-black text-purple-700">
                    <HelpCircle size={16} /> Setup Instructions:
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-600 font-medium">
                    <li>Create an account at the <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline inline-flex items-center gap-1">Resend Dashboard <ExternalLink size={10} /></a>.</li>
                    <li>Add and verify your hospital's custom sending domain in the <strong>Domains</strong> section.</li>
                    <li>Create an API Key with "Sending" permissions, and paste it below. Enter your custom sender email (e.g. <code>no-reply@yourdomain.com</code>).</li>
                  </ol>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Email Integration Mode</label>
                    <select
                      className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.emailProvider}
                      onChange={e => setForm({ ...form, emailProvider: e.target.value })}
                    >
                      <option value="MOCK">MOCK (Sandbox Mode)</option>
                      <option value="RESEND">RESEND (Production Email)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Sender From Email</label>
                    <input
                      type="email"
                      placeholder="e.g. notifications@gammed.com"
                      className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.emailFromAddress}
                      onChange={e => setForm({ ...form, emailFromAddress: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Resend API Key</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Key size={16} /></span>
                    <input
                      type="password"
                      placeholder="re_..."
                      className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                      value={form.emailApiKey}
                      onChange={e => setForm({ ...form, emailApiKey: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pb-4 text-emerald-600">
                  <CreditCard size={22} /> Paystack MoMo Integration
                </h2>

                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex flex-col gap-4 text-xs font-bold">
                  <div className="flex items-center gap-2 font-black text-emerald-700">
                    <HelpCircle size={16} /> Setup Instructions:
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-600 font-medium">
                    <li>Create or log into your account at the <a href="https://dashboard.paystack.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-bold">Paystack Dashboard <ExternalLink size={10} /></a>.</li>
                    <li>Go to your dashboard's <strong>Settings &rarr; API Keys & Webhooks</strong>.</li>
                    <li>Copy your <strong>Public Key</strong> and <strong>Secret Key</strong> (for testing, you can use <code>pk_test_...</code> and <code>sk_test_...</code>) and paste them below.</li>
                    <li>Copy the callback webhook URL below and paste it into the <strong>Webhook URL</strong> field under your Paystack Settings dashboard:</li>
                  </ol>
                  
                  {/* Webhook Clipboard Display */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col gap-2 font-mono text-[10px] select-all break-all border border-slate-800">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest font-sans">Your Webhook Callback URL:</span>
                    <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/paystack?hospitalId=${hospitalId}` : `https://yourdomain.com/api/webhooks/paystack?hospitalId=${hospitalId}`}</code>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Paystack Public Key</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Key size={16} /></span>
                      <input
                        type="text"
                        placeholder="pk_live_... or pk_test_..."
                        className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                        value={form.paystackPublicKey}
                        onChange={e => setForm({ ...form, paystackPublicKey: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Paystack Secret Key</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Key size={16} /></span>
                      <input
                        type="password"
                        placeholder="sk_live_... or sk_test_..."
                        className="w-full p-4 pl-12 border rounded-2xl bg-slate-50 font-bold text-sm outline-none focus:border-primary transition-all"
                        value={form.paystackSecretKey}
                        onChange={e => setForm({ ...form, paystackSecretKey: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pt-6 pb-4 text-slate-800">
                  <Calculator size={22} className="text-slate-700" /> Diagnostic Payment Policy
                </h2>

                <div className="bg-slate-50 p-6 rounded-3xl border space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Select Policy for Laboratory & Radiology</label>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border hover:bg-slate-50">
                      <input 
                        type="radio" 
                        name="diagnosticPaymentPolicy" 
                        value="NONE" 
                        checked={form.diagnosticPaymentPolicy === 'NONE'}
                        onChange={e => setForm({ ...form, diagnosticPaymentPolicy: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800">None / Flexible (Default)</p>
                        <p className="text-[10px] text-slate-500 font-semibold leading-normal">Process diagnostic orders immediately without checking payment status.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border hover:bg-slate-50">
                      <input 
                        type="radio" 
                        name="diagnosticPaymentPolicy" 
                        value="INFORMATIONAL" 
                        checked={form.diagnosticPaymentPolicy === 'INFORMATIONAL'}
                        onChange={e => setForm({ ...form, diagnosticPaymentPolicy: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-xs font-black uppercase text-blue-600">Informational Badging</p>
                        <p className="text-[10px] text-slate-500 font-semibold leading-normal">Display real-time PAID or UNPAID badges in the queues but do not block procedures.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-xl border hover:bg-slate-50">
                      <input 
                        type="radio" 
                        name="diagnosticPaymentPolicy" 
                        value="STRICT" 
                        checked={form.diagnosticPaymentPolicy === 'STRICT'}
                        onChange={e => setForm({ ...form, diagnosticPaymentPolicy: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-xs font-black uppercase text-red-600">Strict Pre-Payment Lock</p>
                        <p className="text-[10px] text-slate-500 font-semibold leading-normal">Disable queue actions (Acquire, Collect Specimen, Enter Results) if unpaid. Allow emergency override checkbox bedside.</p>
                      </div>
                    </label>
                  </div>
                </div>

                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 border-b pt-8 pb-4 text-slate-800">
                  <Droplets size={22} className="text-red-600 fill-red-200" /> Blood Donor Privileges (Tier Benefits)
                </h2>

                <div className="bg-slate-50 p-6 rounded-3xl border space-y-4">
                  <p className="text-[10px] text-slate-500 font-black uppercase leading-normal">
                    Customize clinical and financial benefits for blood bank donors at your hospital. Enter benefits separated by semicolons (e.g. 15% fee waiver;Priority lane).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Bronze Tier (1-4 donations)</label>
                      <textarea
                        rows={2}
                        className="w-full p-4 border rounded-2xl bg-white font-semibold text-xs outline-none focus:border-red-500"
                        value={form.bloodDonorBronzeBenefit}
                        onChange={e => setForm({ ...form, bloodDonorBronzeBenefit: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Silver Tier (5-9 donations)</label>
                      <textarea
                        rows={2}
                        className="w-full p-4 border rounded-2xl bg-white font-semibold text-xs outline-none focus:border-red-500"
                        value={form.bloodDonorSilverBenefit}
                        onChange={e => setForm({ ...form, bloodDonorSilverBenefit: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Gold Tier (10-19 donations)</label>
                      <textarea
                        rows={2}
                        className="w-full p-4 border rounded-2xl bg-white font-semibold text-xs outline-none focus:border-red-500"
                        value={form.bloodDonorGoldBenefit}
                        onChange={e => setForm({ ...form, bloodDonorGoldBenefit: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">Platinum Tier (20+ donations)</label>
                      <textarea
                        rows={2}
                        className="w-full p-4 border rounded-2xl bg-white font-semibold text-xs outline-none focus:border-red-500"
                        value={form.bloodDonorPlatinumBenefit}
                        onChange={e => setForm({ ...form, bloodDonorPlatinumBenefit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full py-5 rounded-2xl h-auto font-black uppercase text-xs tracking-widest bg-primary hover:bg-black text-white transition-all shadow-xl flex items-center justify-center gap-3 mt-8"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Save Changes
          </Button>
        </form>

        {/* Live Document Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-[30px] shadow-lg border border-slate-800">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary mb-1">Branding Preview</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              This preview shows how your branding (name, details, and color scheme) will automatically overlay on printed invoices, purchase orders, receipts, and reports.
            </p>
          </div>

          {/* Invoice Page Mockup */}
          <div className="bg-white border rounded-[40px] shadow-sm overflow-hidden text-xs">
            <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
              <span className="font-black text-slate-500 uppercase tracking-widest text-[9px]">Receipt / Invoice Layout Preview</span>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Custom Branded Header Preview */}
              <div 
                className="p-6 rounded-3xl shadow flex justify-between items-center text-white"
                style={{ 
                  backgroundColor: form.primaryColor 
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="text-white" />
                    <span className="font-black uppercase tracking-tighter text-white">
                      Official Receipt
                    </span>
                  </div>
                  <h4 className="text-base font-black uppercase tracking-tighter text-white">
                    {form.name || 'GAM Medical Clinic'}
                  </h4>
                  <p className="text-[8px] text-white/85 mt-0.5 leading-normal">
                    {form.address || 'Address Line'}<br />
                    {form.location || 'City'}, {form.region || 'Region'}<br />
                    Phone: {form.phone || 'Phone'} | Email: {form.email || 'Email'}
                  </p>
                  {form.website && (
                    <p className="text-[8px] mt-1 font-bold text-white underline">
                      {form.website}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-white/70 uppercase tracking-wider">Receipt No.</p>
                  <p className="text-xs font-mono font-black mt-0.5 text-white">
                    GAM-REC-26-0034
                  </p>
                  <p className="text-[8px] font-black text-white/70 uppercase tracking-wider mt-2">Date</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {new Date().toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>

              {/* Sample Table */}
              <div className="border rounded-2xl overflow-hidden">
                <div 
                  className="p-2 border-b flex justify-between font-black text-[9px] uppercase"
                  style={{ backgroundColor: `${form.secondaryColor}1a` }}
                >
                  <span style={{ color: form.secondaryColor }}>Description</span>
                  <span style={{ color: form.secondaryColor }}>Total</span>
                </div>
                <div className="p-3 space-y-2 border-b text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Consultation (General Practitioner)</span>
                    <span className="font-mono">GHS 150.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Malaria Rapid Diagnostic Test</span>
                    <span className="font-mono">GHS 45.00</span>
                  </div>
                </div>
                {/* Total box dynamic colored */}
                <div className="p-3 flex justify-between items-center" style={{ backgroundColor: `${form.secondaryColor}0a` }}>
                  <span className="font-black uppercase text-[10px]">Grand Total</span>
                  <span className="text-base font-black font-mono" style={{ color: form.primaryColor }}>
                    GHS 195.00
                  </span>
                </div>
              </div>

              {/* Mock button colored with secondaryColor */}
              <button 
                disabled 
                className="w-full py-3 rounded-xl font-bold uppercase text-[10px] tracking-wider text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: form.secondaryColor }}
              >
                <CheckCircle size={14} /> Sample Branded Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
