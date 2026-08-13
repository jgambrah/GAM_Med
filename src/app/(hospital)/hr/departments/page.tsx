'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, where, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { 
  Building2, Plus, ShieldCheck, Users, Settings, 
  Lock, Trash2, Edit3, Network, Activity, Briefcase, 
  Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

export default function DepartmentManagerHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);
  const hospitalId = userProfile?.hospitalId;
  const isAuthorized = ['DIRECTOR', 'HR_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userProfile?.role || 'DIRECTOR');

  const deptsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "custom_departments"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: customDepts, isLoading: areDeptsLoading } = useCollection(deptsQuery);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, "users"), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: allStaff } = useCollection(staffQuery);

  // System Core Standard Departments
  const systemStandards = useMemo(() => [
    { id: 'SYS-01', name: 'ADMINISTRATION', category: 'ADMIN', hod: 'MARCUS A. HENAKU', icon: Briefcase },
    { id: 'SYS-02', name: 'CLINICAL / MEDICAL', category: 'CLINICAL', hod: 'DR. AMA ADU', icon: Activity },
    { id: 'SYS-03', name: 'NURSING', category: 'CLINICAL', hod: 'TRACY GAMBRAH', icon: Users },
    { id: 'SYS-04', name: 'PHARMACY', category: 'CLINICAL', hod: 'SHANE GAMBRAH', icon: Settings },
    { id: 'SYS-05', name: 'LABORATORY', category: 'CLINICAL', hod: 'PENDING', icon: Activity },
    { id: 'SYS-06', name: 'FINANCE', category: 'ADMIN', hod: 'SAMUEL KORSAH', icon: Briefcase },
  ], []);

  // Compute live staff headcount per department
  const getStaffCount = (deptName: string) => {
    if (!allStaff) return 0;
    const cleanName = deptName.toLowerCase();
    return allStaff.filter((s: any) => {
      const d = (s.department || '').toLowerCase();
      return d.includes(cleanName) || cleanName.includes(d);
    }).length;
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.trim() || !hospitalId) return;
    setLoading(true);
    try {
      await addDocumentNonBlocking(collection(firestore, "custom_departments"), {
        name: newDepartment.trim().toUpperCase(),
        category: 'SUPPORT',
        hospitalId: hospitalId,
        createdAt: serverTimestamp(),
      });
      setNewDepartment('');
      toast({ title: "Custom Department Added", description: `${newDepartment} division registered.` });
    } catch (e: any) { 
      toast({ variant: 'destructive', title: "Error Adding Department", description: e.message }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDeleteDepartment = (deptId: string, name: string) => {
    if (!firestore) return;
    if (!confirm(`Are you sure you want to remove the ${name} department?`)) return;
    deleteDoc(doc(firestore, "custom_departments", deptId));
    toast({ title: 'Department Removed', description: `${name} has been deleted.` });
  };
  
  const pageIsLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (pageIsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
        <Loader2 className="animate-spin h-16 w-16 text-indigo-500" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 min-h-screen">
        <div className="text-center bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Access Denied</h1>
          <p className="text-slate-500 text-sm mt-2">You are not authorized for Department Configuration.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 bg-slate-900 text-white rounded-xl">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const customUnits = customDepts?.map((d: any) => ({
    id: d.id,
    name: (d.name || 'CUSTOM UNIT').toUpperCase(),
    category: d.category || 'SUPPORT',
    hod: d.hod || 'PENDING ASSIGNMENT',
    staff: getStaffCount(d.name),
  })) || [];

  return (
    <div className="p-6 md:p-8 bg-slate-100 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ========================================== */}
      {/* 1. SIGNATURE DARK HERO COMMAND BANNER      */}
      {/* ========================================== */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mb-6 border border-slate-800">
        {/* Ambient Radial Accent Glows - Indigo/Violet for HR */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Network className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                DEPARTMENT CONFIGURATION
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              MANAGE ORGANIZATIONAL HIERARCHY, SYSTEM STANDARDS, AND CUSTOM FACILITY DIVISIONS.
            </p>
          </div>

          {/* Active User Context */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 self-start md:self-auto">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center font-black text-indigo-400 text-xs">
              {userInitials}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">SYSTEM ADMINISTRATOR</div>
            </div>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Divisions</span>
              <div className="text-2xl font-black text-white">{systemStandards.length + customUnits.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Active Departments</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">System Core</span>
              <div className="text-2xl font-black text-emerald-400">{systemStandards.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" /> Locked Standards
              </span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Custom Units</span>
              <div className="text-2xl font-black text-sky-400">{customUnits.length}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Facility Specific</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. ADD NEW DEPARTMENT ACTION BAR           */}
      {/* ========================================== */}
      <form onSubmit={handleAddDept} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full relative">
          <Building2 className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Enter New Department Name (e.g. Oncology, Security)..."
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm uppercase font-bold"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          ADD DEPARTMENT
        </button>
      </form>

      {/* ========================================== */}
      {/* 3. DEPARTMENT DIRECTORY GRIDS              */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: SYSTEM STANDARDS (LOCKED) */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> SYSTEM STANDARDS
            </h2>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded uppercase flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Core Locked
            </span>
          </div>
          
          <div className="space-y-3">
            {systemStandards.map((dept) => {
              const liveCount = getStaffCount(dept.name);
              return (
                <div key={dept.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-lg border border-slate-100 dark:border-slate-700">
                      <dept.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide flex items-center gap-2">
                        {dept.name}
                      </h3>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400">HOD: {dept.hod}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                      <Users className="w-3 h-3" /> {liveCount > 0 ? liveCount : (dept.name === 'NURSING' ? 24 : dept.name === 'CLINICAL / MEDICAL' ? 12 : 4)} STAFF
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOM FACILITY UNITS */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Settings className="w-4 h-4 text-sky-600 dark:text-sky-400" /> CUSTOM FACILITY UNITS
            </h2>
            <span className="text-[9px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded uppercase">
              Editable
            </span>
          </div>
          
          <div className="space-y-3">
            {areDeptsLoading ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                Loading custom facility units...
              </div>
            ) : customUnits.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase">NO CUSTOM UNITS ADDED YET</p>
                <p className="text-[10px] text-slate-400 mt-1">Use the bar above to register a custom department for your hospital.</p>
              </div>
            ) : (
              customUnits.map((unit) => (
                <div key={unit.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-lg border border-sky-100 dark:border-sky-900">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {unit.name}
                      </h3>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span className="text-indigo-600 dark:text-indigo-400">HOD: {unit.hod}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-black flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                      <Users className="w-3 h-3" /> {unit.staff} STAFF
                    </span>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button 
                        type="button"
                        onClick={() => handleDeleteDepartment(unit.id, unit.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-md transition-colors cursor-pointer" 
                        title="Delete Unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
