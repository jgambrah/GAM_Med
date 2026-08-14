'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, addDocumentNonBlocking } from '@/firebase';
import { collection, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Cog, Plus, Loader2, ShieldAlert, Package, Trash2, Search, 
  Building2, BedDouble, Stethoscope, CheckCircle2, AlertTriangle, 
  Wrench, Activity, Landmark, User, RefreshCw, Sparkles, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type DepartmentNode = {
  id: string;
  name: string;
  code: string;
  revenueAccountCode: string;
  expenseAccountCode: string;
  headOfDepartment: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type HospitalBedNode = {
  id: string;
  departmentId: string;
  wardName: string;
  bedNumber: string;
  bedType: 'GENERAL' | 'VIP' | 'ICU' | 'INCUBATOR';
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  activePatientId?: string;
  dailyTariffCode: string;
  dailyRate: number;
};

type ServiceBridgeNode = {
  id: string;
  name: string;
  clinicalModule: string;
  tariffCode: string;
  price: number;
  nhisCap: number;
  autoBillOnComplete: boolean;
};

export default function GeneralServicesSetupPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'DEPARTMENTS' | 'BED_MATRIX' | 'SERVICE_NODES'>('DEPARTMENTS');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = userRole === 'DIRECTOR' || userRole === 'ADMIN' || userRole === 'ACCOUNTANT' || userRole === 'SUPER_ADMIN';

  // Real-Time Collections
  const bedsQuery = useMemoFirebase(() => hospitalId && firestore ? query(collection(firestore, `hospitals/${hospitalId}/infrastructure_nodes`)) : null, [firestore, hospitalId]);
  const { data: rawBeds, isLoading: bedsLoading } = useCollection<HospitalBedNode>(bedsQuery);

  // Demo Fallback Data for Departments
  const demoDepartments: DepartmentNode[] = useMemo(() => [
    { id: 'dep-01', name: 'Outpatient Department (OPD)', code: 'OPD', revenueAccountCode: '4001', expenseAccountCode: '5001', headOfDepartment: 'Dr. Kwabena Frimpong', status: 'ACTIVE' },
    { id: 'dep-02', name: 'Maternity & Antenatal Ward', code: 'MAT', revenueAccountCode: '4002', expenseAccountCode: '5002', headOfDepartment: 'Dr. Abena Osei', status: 'ACTIVE' },
    { id: 'dep-03', name: 'Diagnostic Radiology & Imaging', code: 'RAD', revenueAccountCode: '4003', expenseAccountCode: '5003', headOfDepartment: 'Dr. Michael Taylor', status: 'ACTIVE' },
    { id: 'dep-04', name: 'Main Clinical Laboratory', code: 'LAB', revenueAccountCode: '4004', expenseAccountCode: '5004', headOfDepartment: 'Dr. Sarah Kwarteng', status: 'ACTIVE' },
    { id: 'dep-05', name: 'Intensive Care Unit (ICU)', code: 'ICU', revenueAccountCode: '4005', expenseAccountCode: '5005', headOfDepartment: 'Dr. Marcus Amosah', status: 'ACTIVE' }
  ], []);

  // Demo Fallback Data for Hospital Beds
  const demoBeds: HospitalBedNode[] = useMemo(() => [
    { id: 'bed-mat-01', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '01', bedType: 'GENERAL', status: 'AVAILABLE', dailyTariffCode: 'ACC-GEN-01', dailyRate: 150.00 },
    { id: 'bed-mat-02', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '02', bedType: 'GENERAL', status: 'OCCUPIED', activePatientId: 'P-99201 (Abena M.)', dailyTariffCode: 'ACC-GEN-01', dailyRate: 150.00 },
    { id: 'bed-mat-03', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '03', bedType: 'VIP', status: 'OCCUPIED', activePatientId: 'P-88402 (Grace A.)', dailyTariffCode: 'ACC-VIP-01', dailyRate: 450.00 },
    { id: 'bed-mat-04', departmentId: 'dep-02', wardName: 'Maternity Ward A', bedNumber: '04', bedType: 'GENERAL', status: 'MAINTENANCE', dailyTariffCode: 'ACC-GEN-01', dailyRate: 150.00 },
    { id: 'bed-icu-01', departmentId: 'dep-05', wardName: 'ICU High Dependency', bedNumber: 'ICU-01', bedType: 'ICU', status: 'OCCUPIED', activePatientId: 'P-77109 (Kofi O.)', dailyTariffCode: 'ACC-ICU-01', dailyRate: 850.00 },
    { id: 'bed-icu-02', departmentId: 'dep-05', wardName: 'ICU High Dependency', bedNumber: 'ICU-02', bedType: 'ICU', status: 'AVAILABLE', dailyTariffCode: 'ACC-ICU-01', dailyRate: 850.00 }
  ], []);

  // Demo Fallback Data for Service Bridge Nodes
  const demoServices: ServiceBridgeNode[] = useMemo(() => [
    { id: 'srv-01', name: 'Specialist OPD Consultation', clinicalModule: 'Consultation', tariffCode: 'CON-001', price: 150.00, nhisCap: 80.00, autoBillOnComplete: true },
    { id: 'srv-02', name: 'Abdominal Ultrasound Scan', clinicalModule: 'Radiology', tariffCode: 'RAD-004', price: 250.00, nhisCap: 120.00, autoBillOnComplete: true },
    { id: 'srv-03', name: 'Full Blood Count Automated Panel', clinicalModule: 'Laboratory', tariffCode: 'LAB-012', price: 120.00, nhisCap: 45.00, autoBillOnComplete: true }
  ], []);

  const bedsList = useMemo(() => {
    return rawBeds && rawBeds.length > 0 ? rawBeds : demoBeds;
  }, [rawBeds, demoBeds]);

  // Group beds by Ward Name for Matrix
  const groupedWards = useMemo(() => {
    return bedsList.reduce((acc, bed) => {
      const ward = bed.wardName || 'General Ward';
      if (!acc[ward]) acc[ward] = [];
      acc[ward].push(bed);
      return acc;
    }, {} as Record<string, HospitalBedNode[]>);
  }, [bedsList]);

  // Bed Telemetry
  const totalBedsCount = bedsList.length;
  const occupiedBedsCount = bedsList.filter(b => b.status === 'OCCUPIED').length;
  const availableBedsCount = bedsList.filter(b => b.status === 'AVAILABLE').length;
  const maintenanceBedsCount = bedsList.filter(b => b.status === 'MAINTENANCE').length;
  const occupancyRate = totalBedsCount > 0 ? Math.round((occupiedBedsCount / totalBedsCount) * 100) : 0;

  const toggleBedMaintenance = async (bedId: string, currentStatus: string) => {
    if (currentStatus === 'OCCUPIED') {
      toast({ variant: 'destructive', title: 'Action Blocked', description: 'Cannot mark an occupied bed for maintenance.' });
      return;
    }

    const newStatus = currentStatus === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';

    try {
      if (firestore && hospitalId) {
        const bedRef = doc(firestore, `hospitals/${hospitalId}/infrastructure_nodes`, bedId);
        await updateDoc(bedRef, { status: newStatus });
      }
      toast({
        title: 'Bed Status Updated',
        description: `Bed state changed to ${newStatus}.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
    }
  };

  const isLoading = isUserLoading || isProfileLoading || bedsLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Infrastructure & Revenue Setup.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, User Context */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Cog className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                HOSPITAL INFRASTRUCTURE & REVENUE CENTER SETUP
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              CONFIGURE DEPARTMENTS, BED WARDS, SERVICE NODES, AND REVENUE LEDGER MAPPINGS.
            </p>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start xl:self-auto">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">CHIEF ACCOUNTANT</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Contextual Telemetry */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Departments</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">14 Departments</div>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Mapped to GL Ledger Codes</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Bed Capacity</span>
              <div className="text-2xl font-black text-sky-400 font-mono">{totalBedsCount} Beds</div>
              <span className="text-[10px] font-bold text-sky-400 mt-0.5 block">{availableBedsCount} Available • {maintenanceBedsCount} Cleaning</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <BedDouble className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between ring-1 ring-emerald-500/20 shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Current Occupancy Rate</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{occupancyRate}%</div>
              <span className="text-[10px] font-bold text-emerald-400 mt-0.5 block">Automated Midnight Census</span>
            </div>
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. INFRASTRUCTURE CONTROL CENTER TABS      */}
      {/* ========================================== */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>DEPARTMENTS & REVENUE CENTERS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BED_MATRIX')}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'BED_MATRIX'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>BED MANAGEMENT MATRIX</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SERVICE_NODES')}
          className={`px-5 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SERVICE_NODES'
              ? 'bg-sky-600 text-white shadow-lg'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>SERVICE NODES & TARIFF BRIDGE</span>
        </button>
      </div>

      {/* ========================================== */}
      {/* 3. TAB 1: DEPARTMENTS & GL REVENUE MAPPINGS */}
      {/* ========================================== */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-500" />
                <span>Departmental Revenue & Cost Center Ledger Mappings</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Hard-linked GL revenue codes ensure billing proceeds route to exact departmental P&L accounts.
              </p>
            </div>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Department Name</th>
                <th className="p-4">Dept Code</th>
                <th className="p-4 text-center">Revenue Ledger Account</th>
                <th className="p-4 text-center">Expense Cost Center</th>
                <th className="p-4">Head of Department</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {demoDepartments.map(dept => (
                <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                    {dept.name}
                  </td>
                  <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {dept.code}
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300">
                      Code {dept.revenueAccountCode}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                    <span className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-lg text-sky-800 dark:text-sky-300">
                      Code {dept.expenseAccountCode}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                    {dept.headOfDepartment}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase rounded">
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. TAB 2: BED MANAGEMENT MATRIX            */}
      {/* ========================================== */}
      {activeTab === 'BED_MATRIX' && (
        <div className="space-y-6">
          {/* Status Legend */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Available ({availableBedsCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-rose-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Occupied ({occupiedBedsCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Maintenance / Cleaning ({maintenanceBedsCount})</span>
            </div>
          </div>

          {/* Wards Matrix Grid */}
          {Object.keys(groupedWards).map(wardName => (
            <div key={wardName} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <BedDouble className="w-5 h-5 text-emerald-500" />
                <span>{wardName}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {groupedWards[wardName].map(bed => {
                  const isAvailable = bed.status === 'AVAILABLE';
                  const isOccupied = bed.status === 'OCCUPIED';
                  const isMaintenance = bed.status === 'MAINTENANCE';

                  return (
                    <div
                      key={bed.id}
                      onClick={() => toggleBedMaintenance(bed.id, bed.status)}
                      className={`p-4 rounded-2xl border-2 transition-all shadow-sm flex flex-col items-center justify-between h-28 relative cursor-pointer ${
                        isAvailable ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-950/80' : ''
                      } ${
                        isOccupied ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 cursor-not-allowed' : ''
                      } ${
                        isMaintenance ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 border-dashed hover:bg-amber-100 dark:hover:bg-amber-950/80' : ''
                      }`}
                    >
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{bed.bedType}</span>
                      <span className={`text-2xl font-black ${
                        isAvailable ? 'text-emerald-700 dark:text-emerald-300' : isOccupied ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
                      }`}>
                        {bed.bedNumber}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 font-mono">
                        ₵ {bed.dailyRate.toFixed(2)}/night
                      </span>

                      {/* Active Patient Badge */}
                      {isOccupied && bed.activePatientId && (
                        <div className="absolute -top-2.5 -right-2 bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md truncate max-w-[110px] border border-slate-800">
                          {bed.activePatientId}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* 5. TAB 3: SERVICE NODES & TARIFF BRIDGE    */}
      {/* ========================================== */}
      {activeTab === 'SERVICE_NODES' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-500" />
                <span>Clinical Action to Tariff Master Billing Bridge</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Clinical orders (lab, radiology scans, specialist visits) automatically push Tariff Master items to patient billing sessions.
              </p>
            </div>
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest">
              <tr>
                <th className="p-4">Clinical Action Node</th>
                <th className="p-4">Clinical Module</th>
                <th className="p-4 font-mono">Tariff Master Code</th>
                <th className="p-4 text-right">Base Cash Rate (₵)</th>
                <th className="p-4 text-right">NHIS Tariff Cap (₵)</th>
                <th className="p-4 text-center">Auto-Bill Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {demoServices.map(srv => (
                <tr key={srv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                  <td className="p-4 font-black uppercase text-slate-900 dark:text-slate-100">
                    {srv.name}
                  </td>
                  <td className="p-4 font-bold text-slate-600 dark:text-slate-300">
                    {srv.clinicalModule}
                  </td>
                  <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {srv.tariffCode}
                  </td>
                  <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ₵ {srv.price.toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-slate-500">
                    ₵ {srv.nhisCap.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[9px] uppercase rounded">
                      AUTO-BILL ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
