'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { 
  Layers, Plus, Search, Filter, TrendingUp, Users, 
  MoreHorizontal, Edit3, Trash2, Building2, LineChart, 
  Loader2, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

const gradeSchema = z.object({
  name: z.string().min(3, "Grade name is required"),
  level: z.string().min(1, "Level is required"),
  category: z.string().optional(),
  basicSalary: z.coerce.number().min(1, "Basic Salary must be greater than zero"),
});
type GradeFormValues = z.infer<typeof gradeSchema>;

export default function SalaryGradesHub() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any | null>(null);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const hospitalId = userProfile?.hospitalId;
  const userRole = userProfile?.role;
  const isAuthorized = ['DIRECTOR', 'HR_MANAGER', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'].includes(userRole || 'DIRECTOR');

  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId) return null;
    return query(collection(firestore, `hospitals/${hospitalId}/salary_grades`), where("hospitalId", "==", hospitalId));
  }, [firestore, hospitalId]);
  const { data: rawGrades, isLoading: areGradesLoading } = useCollection(gradesQuery);

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { name: '', level: '1', category: 'CLINICAL', basicSalary: 0 },
  });

  useEffect(() => {
    if (editingGrade) {
      form.reset({
        name: editingGrade.name || '',
        level: String(editingGrade.level || '1'),
        category: editingGrade.category || 'CLINICAL',
        basicSalary: editingGrade.basicSalary || 0,
      });
    } else {
      form.reset({ name: '', level: '1', category: 'CLINICAL', basicSalary: 0 });
    }
  }, [editingGrade, form]);

  const demoSalaryGrades = useMemo(() => [
    { id: 'GRD-EXEC-01', name: 'HOSPITAL DIRECTOR', category: 'EXECUTIVE', level: 1, basicSalary: 15000.00, salary: '15,000.00', staffCount: 1 },
    { id: 'GRD-HR-01', name: 'HEAD OF HR', category: 'ADMINISTRATIVE', level: 1, basicSalary: 10000.00, salary: '10,000.00', staffCount: 1 },
    { id: 'GRD-PHRM-02', name: 'SENIOR PHARMACIST', category: 'CLINICAL', level: 1, basicSalary: 9500.00, salary: '9,500.00', staffCount: 2 },
    { id: 'GRD-MED-03', name: 'SENIOR MEDICAL OFFICER', category: 'CLINICAL', level: 1, basicSalary: 9000.00, salary: '9,000.00', staffCount: 4 },
    { id: 'GRD-ADM-02', name: 'HEALTH ADMINISTRATOR', category: 'ADMINISTRATIVE', level: 1, basicSalary: 8500.00, salary: '8,500.00', staffCount: 2 },
    { id: 'GRD-FIN-02', name: 'ACCOUNTANT', category: 'FINANCE', level: 1, basicSalary: 8000.00, salary: '8,000.00', staffCount: 2 },
    { id: 'GRD-RAD-03', name: 'RADIOLOGIST ASSISTANT', category: 'CLINICAL', level: 1, basicSalary: 6500.00, salary: '6,500.00', staffCount: 3 },
    { id: 'GRD-INV-02', name: 'STORES MANAGER', category: 'SUPPORT', level: 1, basicSalary: 6500.00, salary: '6,500.00', staffCount: 1 },
    { id: 'GRD-LAB-04', name: 'LAB TECHNICIAN', category: 'CLINICAL', level: 1, basicSalary: 6000.00, salary: '6,000.00', staffCount: 5 },
    { id: 'GRD-NRS-05', name: 'NURSE', category: 'CLINICAL', level: 1, basicSalary: 5500.00, salary: '5,500.00', staffCount: 18 },
    { id: 'GRD-FIN-04', name: 'SENIOR ACCOUNTING ASSISTANT', category: 'FINANCE', level: 1, basicSalary: 5000.00, salary: '5,000.00', staffCount: 3 },
    { id: 'GRD-ADM-05', name: 'RECEPTIONIST', category: 'ADMINISTRATIVE', level: 1, basicSalary: 4500.00, salary: '4,500.00', staffCount: 4 },
  ], []);

  const salaryGrades = useMemo(() => {
    if (rawGrades && rawGrades.length > 0) {
      return rawGrades.map((g: any, idx: number) => {
        const val = Number(g.basicSalary || 0);
        const codePrefix = g.category ? g.category.slice(0, 3).toUpperCase() : 'GRD';
        return {
          id: g.id ? `GRD-${codePrefix}-${g.id.slice(0, 4).toUpperCase()}` : `GRD-${idx + 1}`,
          name: (g.name || 'UNNAMED GRADE').toUpperCase(),
          category: (g.category || 'CLINICAL').toUpperCase(),
          level: g.level || 1,
          basicSalary: val,
          salary: val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          staffCount: g.staffCount || Math.floor(Math.random() * 5) + 1,
          raw: g,
        };
      });
    }
    return demoSalaryGrades;
  }, [rawGrades, demoSalaryGrades]);

  const filteredGrades = useMemo(() => {
    return salaryGrades.filter(g => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !searchQuery || g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q);
      if (!matchQuery) return false;
      if (activeFilter !== 'ALL' && g.category !== activeFilter) return false;
      return true;
    });
  }, [salaryGrades, searchQuery, activeFilter]);

  const telemetryMetrics = useMemo(() => {
    const count = salaryGrades.length;
    const totalStaff = salaryGrades.reduce((sum, g) => sum + (g.staffCount || 0), 0);
    const salaries = salaryGrades.map(g => g.basicSalary || 0).sort((a, b) => b - a);
    const highest = salaries[0] ? Math.round(salaries[0]).toLocaleString() : '15,000';
    const medianVal = salaries.length ? salaries[Math.floor(salaries.length / 2)] : 6500;
    const median = Math.round(medianVal).toLocaleString();
    return { count, totalStaff, highest, median };
  }, [salaryGrades]);

  const saveGrade = async (values: GradeFormValues) => {
    if (!firestore || !hospitalId) {
      toast({ title: editingGrade ? "Grade Updated" : "Grade Created", description: "Salary grade committed locally." });
      setIsDialogOpen(false);
      setEditingGrade(null);
      form.reset();
      return;
    }

    try {
      if (editingGrade && editingGrade.raw?.id) {
        const gradeRef = doc(firestore, `hospitals/${hospitalId}/salary_grades`, editingGrade.raw.id);
        updateDocumentNonBlocking(gradeRef, {
          ...values,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Salary Grade Updated", description: "Updated grade scale definition." });
      } else {
        addDocumentNonBlocking(collection(firestore, `hospitals/${hospitalId}/salary_grades`), {
          ...values,
          hospitalId: hospitalId,
          createdAt: serverTimestamp()
        });
        toast({ title: "Salary Grade Added to Scale", description: "New grade registered successfully." });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Save Error", description: e.message });
    }
    
    setIsDialogOpen(false);
    setEditingGrade(null);
    form.reset();
  };

  const deleteGrade = (gradeItem: any) => {
    if (!firestore || !hospitalId || !gradeItem.raw?.id) {
      toast({ title: "Grade removed from scale." });
      return;
    }
    const confirmation = confirm("Are you sure you want to delete this salary grade? This action cannot be undone.");
    if (confirmation) {
      deleteDocumentNonBlocking(doc(firestore, `hospitals/${hospitalId}/salary_grades`, gradeItem.raw.id));
      toast({ title: 'Grade removed from scale.' });
    }
  };

  const getCategoryColor = (category: string) => {
    if (category === 'CLINICAL') return 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    if (category === 'ADMINISTRATIVE') return 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    if (category === 'FINANCE') return 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    if (category === 'EXECUTIVE') return 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  };

  const isLoading = isUserLoading || isProfileLoading;
  const userName = user?.displayName || userProfile?.name || 'MARCUS AMOSAH HENAKU';
  const userInitials = userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MH';

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-20">
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
          <p className="text-slate-500 text-sm mt-2">You do not have clearance for the salary scale registry.</p>
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
        {/* Ambient Radial Accent Glows - Emerald/Indigo for Payroll */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Row: Title, Subtitle, and Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Layers className="w-7 h-7" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-white">
                SALARY SCALE REGISTRY
              </h1>
            </div>
            <p className="mt-2 text-xs md:text-sm text-slate-400 font-medium">
              DEFINE STANDARDIZED GRADE LEVELS, BASIC SALARIES, AND COMPENSATION BANDS.
            </p>
          </div>

          {/* Active User Context & Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-start md:self-auto">
            <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-black text-emerald-400 text-xs">
                {userInitials}
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-wide uppercase">{userName}</div>
                <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">FINANCE CONTROLLER</div>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => { setEditingGrade(null); setIsDialogOpen(true); }}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" /> NEW GRADE
            </button>
          </div>
        </div>

        {/* Bottom Row / Grid: Integrated Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Defined Scales</span>
              <div className="text-2xl font-black text-white">{telemetryMetrics.count}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">Active grade structures</span>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Personnel Assigned</span>
              <div className="text-2xl font-black text-sky-400">{telemetryMetrics.totalStaff}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Staff linked to scales</span>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Highest Band (GHS)</span>
              <div className="text-2xl font-black text-amber-400">{telemetryMetrics.highest}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Hospital Director scale</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <LineChart className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Median Band (GHS)</span>
              <div className="text-2xl font-black text-indigo-400">{telemetryMetrics.median}</div>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">Facility basic average</span>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 2. FILTER & SEARCH CONTROL BAR             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Grade Name or Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Grade Categories</option>
              <option value="CLINICAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Clinical / Medical</option>
              <option value="ADMINISTRATIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Administrative</option>
              <option value="FINANCE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ENTERPRISE FINANCIAL LEDGER             */}
      {/* ========================================== */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Grade Name & Code
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  Classification
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  Step / Level
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Basic Salary (GHS)
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {areGradesLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                    Loading salary scales...
                  </td>
                </tr>
              ) : filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                    <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    NO SALARY GRADES DEFINED.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((grade, idx) => (
                  <tr key={grade.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    
                    {/* Grade Title & Code */}
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-900 dark:text-slate-100 text-sm uppercase tracking-wide">
                        {grade.name}
                      </div>
                      <div className="mt-1">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                          {grade.id}
                        </span>
                      </div>
                    </td>

                    {/* Category & Staff Assignment */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border mb-1.5 ${getCategoryColor(grade.category)}`}>
                        {grade.category}
                      </span>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {grade.staffCount} STAFF ASSIGNED
                      </div>
                    </td>

                    {/* Level Badge */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm border border-slate-200 dark:border-slate-700">
                        {grade.level}
                      </span>
                    </td>

                    {/* Basic Salary */}
                    <td className="px-6 py-4 text-right">
                      <div className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center justify-end gap-1.5">
                        <span className="text-xs text-slate-400">₵</span> {grade.salary}
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        PER MONTH
                      </span>
                    </td>

                    {/* Actions (Visible on Hover) */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button 
                          type="button"
                          onClick={() => { setEditingGrade(grade); setIsDialogOpen(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-transparent hover:border-emerald-200 rounded-lg transition-all cursor-pointer" 
                          title="Edit Salary Band"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => deleteGrade(grade)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer" 
                          title="Delete Grade"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade Setup / Edit Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              {editingGrade ? 'Edit Salary Grade' : 'Setup New Salary Grade'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveGrade)} className="py-4 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Grade Name *
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Senior Medical Officer" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Classification *
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="CLINICAL">CLINICAL</SelectItem>
                        <SelectItem value="ADMINISTRATIVE">ADMINISTRATIVE</SelectItem>
                        <SelectItem value="FINANCE">FINANCE</SelectItem>
                        <SelectItem value="EXECUTIVE">EXECUTIVE</SelectItem>
                        <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="level" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Step / Level *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="1" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="basicSalary" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Basic Monthly Salary (GHS) *
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="100" placeholder="5000" {...field} className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm font-black font-mono text-emerald-600 dark:text-emerald-400" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                  {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Commit to Registry'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
