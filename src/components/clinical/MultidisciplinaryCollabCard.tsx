'use client';
import { useState, useMemo } from 'react';
import { Users, Send, CheckCircle2, Clock, AlertTriangle, Sparkles, MessageSquare, ShieldCheck, Plus, Trash2, ChevronDown, ChevronUp, UserCheck, Stethoscope, CheckSquare, Square } from 'lucide-react';
import {
  getAvailableSpecialtyTags,
  getPresetNurseMicroTasks,
  EConsultRequest,
  NurseTask
} from '@/ai/flows/ai-collaboration-engine';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MultidisciplinaryCollabCardProps {
  patientId?: string;
  hospitalId?: string;
  patientName?: string;
  defaultExpanded?: boolean;
}

export function MultidisciplinaryCollabCard({
  patientId,
  hospitalId: propHospitalId,
  patientName = 'Patient',
  defaultExpanded = true
}: MultidisciplinaryCollabCardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const params = useParams();
  const effectivePatientId = patientId || (params?.id as string);

  const userProfileRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userProfile } = useDoc(userProfileRef);

  const hospitalId = propHospitalId || userProfile?.hospitalId;

  // Firestore live queries for E-Consults and Nurse Tasks
  const eConsultsQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !effectivePatientId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/e_consults`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, effectivePatientId]);
  const { data: dbEConsults } = useCollection<any>(eConsultsQuery);

  const nurseTasksQuery = useMemoFirebase(() => {
    if (!firestore || !hospitalId || !effectivePatientId) return null;
    return query(
      collection(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/nurse_tasks`),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, hospitalId, effectivePatientId]);
  const { data: dbNurseTasks } = useCollection<any>(nurseTasksQuery);

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedSpecialty, setSelectedSpecialty] = useState('OBGYN');
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [consultPriority, setConsultPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('URGENT');

  const [selectedConsultForResponse, setSelectedConsultForResponse] = useState<string | null>(null);
  const [specialistOpinionText, setSpecialistOpinionText] = useState('');

  const [customNurseTask, setCustomNurseTask] = useState('');

  const specialties = useMemo(() => getAvailableSpecialtyTags(), []);
  const presetNurseTasks = useMemo(() => getPresetNurseMicroTasks(), []);

  // Submit E-Consult Request
  const handleCreateEConsult = () => {
    if (!clinicalQuestion.trim()) return;

    if (firestore && hospitalId && effectivePatientId) {
      const consultId = `ECONSULT-${Date.now()}`;
      const consultRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/e_consults/${consultId}`);
      
      const specialtyName = specialties.find(s => s.id === selectedSpecialty)?.name || selectedSpecialty;

      setDocumentNonBlocking(consultRef, {
        id: consultId,
        patientId: effectivePatientId,
        patientName,
        requestingDoctorName: user?.displayName || userProfile?.name || 'Attending Physician',
        taggedSpecialty: specialtyName,
        clinicalQuestion: clinicalQuestion.trim(),
        priority: consultPriority,
        status: 'PENDING',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, { merge: true });

      toast({
        title: `🌐 E-Consult Dispatched: ${specialtyName}`,
        description: `Tagged specialist alert sent for ${patientName}.`
      });

      setClinicalQuestion('');
    }
  };

  // Submit Specialist Signed Opinion
  const handleAttachSpecialistOpinion = (consultId: string) => {
    if (!specialistOpinionText.trim()) return;

    if (firestore && hospitalId && effectivePatientId) {
      const consultRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/e_consults/${consultId}`);
      setDocumentNonBlocking(consultRef, {
        specialistOpinion: specialistOpinionText.trim(),
        specialistName: user?.displayName || userProfile?.name || 'Specialist Consultant',
        signedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'SIGNED'
      }, { merge: true });

      toast({
        title: '✍️ Signed Consult Opinion Attached',
        description: `Attending physician notified for ${patientName}.`
      });

      setSelectedConsultForResponse(null);
      setSpecialistOpinionText('');
    }
  };

  // Delegate Nurse Micro-Task
  const handleDelegateNurseTask = (description: string, isUrgent = false, category: NurseTask['category'] = 'GENERAL') => {
    if (!description.trim()) return;

    if (firestore && hospitalId && effectivePatientId) {
      const taskId = `NURSETASK-${Date.now()}`;
      const taskRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/nurse_tasks/${taskId}`);
      
      setDocumentNonBlocking(taskRef, {
        id: taskId,
        patientId: effectivePatientId,
        patientName,
        assigningDoctorName: user?.displayName || userProfile?.name || 'Attending Doctor',
        category,
        taskDescription: description.trim(),
        isUrgent,
        status: 'PENDING',
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, { merge: true });

      toast({
        title: '📋 Task Delegated to Nursing Floor',
        description: `Assigned micro-task to floor queue for ${patientName}.`
      });

      setCustomNurseTask('');
    }
  };

  // Toggle Nurse Task Completion Checkmark
  const handleToggleNurseTaskStatus = (taskId: string, currentStatus: string) => {
    if (firestore && hospitalId && effectivePatientId) {
      const taskRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/nurse_tasks/${taskId}`);
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

      setDocumentNonBlocking(taskRef, {
        status: newStatus,
        completedBy: newStatus === 'COMPLETED' ? (user?.displayName || userProfile?.name || 'Floor Nurse') : null,
        completedAt: newStatus === 'COMPLETED' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
      }, { merge: true });

      toast({
        title: newStatus === 'COMPLETED' ? '✅ Nurse Task Marked Completed' : '🔄 Nurse Task Re-opened',
        description: `Updated floor task status for ${patientName}.`
      });
    }
  };

  const handleDeleteNurseTask = (taskId: string) => {
    if (firestore && hospitalId && effectivePatientId) {
      const taskRef = doc(firestore, `hospitals/${hospitalId}/patients/${effectivePatientId}/nurse_tasks/${taskId}`);
      deleteDocumentNonBlocking(taskRef);
    }
  };

  return (
    <div className="bg-slate-950 text-white rounded-[32px] border-4 border-cyan-600 shadow-2xl overflow-hidden transition-all mb-6">
      {/* COLLAPSIBLE HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        className="p-5 bg-cyan-950/40 hover:bg-cyan-900/40 flex flex-col md:flex-row justify-between items-start md:items-center cursor-pointer transition-all border-b border-cyan-900 gap-3 select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-900/80 rounded-2xl border border-cyan-700 text-cyan-300">
            <Users className="animate-pulse" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-cyan-300">Asynchronous Multi-Disciplinary Collaboration Hub</h3>
              <span className="text-[9px] font-black bg-cyan-600 text-white px-2 py-0.5 rounded-full uppercase">
                {dbEConsults ? dbEConsults.length : 0} CONSULTS • {dbNurseTasks ? dbNurseTasks.length : 0} TASKS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
              In-App Specialist Tagging & Signed Consult Opinions • Real-Time Nurse Floor Task Delegation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="text-cyan-400 font-black text-xs uppercase rounded-xl">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {isExpanded ? 'Collapse' : 'Expand Hub'}
          </Button>
        </div>
      </div>

      {/* EXPANDABLE COLLABORATION WORKSPACE */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* SECTION 1: IN-APP E-CONSULTS & SPECIALIST TAGGING */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <Stethoscope size={14} /> In-App "E-Consults" & Specialist Tagging:
            </h4>

            {/* CREATE E-CONSULT BAR */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tag Specialty:</label>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-purple-300 font-bold outline-none cursor-pointer"
                >
                  {specialties.map((spec) => (
                    <option key={spec.id} value={spec.id}>{spec.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Priority Level:</label>
                <select
                  value={consultPriority}
                  onChange={(e: any) => setConsultPriority(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-bold outline-none cursor-pointer"
                >
                  <option value="ROUTINE">Routine Consult</option>
                  <option value="URGENT">Urgent Priority</option>
                  <option value="STAT">STAT Emergency</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Clinical Question for Specialist:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clinicalQuestion}
                    onChange={(e) => setClinicalQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateEConsult()}
                    placeholder="E.g. 'Patient 32w preeclampsia, recommend labetalol vs hydralazine IV dosing?'"
                    className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-medium"
                  />
                  <Button
                    type="button"
                    onClick={handleCreateEConsult}
                    disabled={!clinicalQuestion.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase rounded-xl px-4 flex items-center gap-1 shadow-lg disabled:opacity-50"
                  >
                    <Send size={14} /> Tag Specialist
                  </Button>
                </div>
              </div>
            </div>

            {/* E-CONSULTS STREAM */}
            <div className="space-y-3 pt-2">
              {dbEConsults && dbEConsults.length > 0 ? (
                dbEConsults.map((consult: any) => (
                  <div key={consult.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                          <UserCheck size={10} /> {consult.taggedSpecialty}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          consult.priority === 'STAT' ? 'bg-red-600 text-white animate-pulse' :
                          consult.priority === 'URGENT' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {consult.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">Requested by: {consult.requestingDoctorName}</span>
                      </div>

                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        consult.status === 'SIGNED' ? 'bg-emerald-600 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {consult.status === 'SIGNED' ? '✅ SIGNED CONSULT ATTACHED' : '⏳ PENDING SPECIALIST REVIEW'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium text-slate-200">
                      <span className="text-[10px] font-black uppercase text-purple-400 block mb-0.5">Clinical Question:</span>
                      "{consult.clinicalQuestion}"
                    </div>

                    {/* SPECIALIST SIGNED OPINION BOX */}
                    {consult.specialistOpinion ? (
                      <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-800 text-xs font-medium text-emerald-200 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-emerald-400">
                          <span>Signed Specialist Opinion ({consult.specialistName}):</span>
                          <span>Signed at {consult.signedAt}</span>
                        </div>
                        <p className="italic">"{consult.specialistOpinion}"</p>
                      </div>
                    ) : (
                      selectedConsultForResponse === consult.id ? (
                        <div className="p-3 bg-slate-900 rounded-xl border border-purple-800 space-y-2">
                          <textarea
                            value={specialistOpinionText}
                            onChange={(e) => setSpecialistOpinionText(e.target.value)}
                            placeholder="Write remote specialist consultation opinion & recommendations..."
                            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 h-20"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedConsultForResponse(null)}
                              className="text-xs text-slate-400"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleAttachSpecialistOpinion(consult.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl px-4"
                            >
                              ✍️ Sign & Attach Consult Opinion
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedConsultForResponse(consult.id)}
                          className="bg-slate-900 hover:bg-slate-800 border-purple-700 text-purple-300 font-black text-[10px] uppercase rounded-xl h-7"
                        >
                          ✍️ Attach Specialist Consult Opinion
                        </Button>
                      )
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 font-medium">
                  No E-Consults requested yet. Select a specialty and submit a question above.
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: REAL-TIME NURSE TASK DELEGATION */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
              <CheckSquare size={14} /> Real-Time Nurse Floor Task Delegation:
            </h4>

            {/* PRESET 1-CLICK NURSE MICRO-TASKS */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block">1-Click Micro-Task Delegation Shortcuts:</span>
              <div className="flex flex-wrap gap-2">
                {presetNurseTasks.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDelegateNurseTask(preset.description, preset.isUrgent, preset.category)}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-slate-300 hover:text-emerald-300 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1"
                  >
                    <Plus size={12} className="text-emerald-400" />
                    {preset.description}
                  </button>
                ))}
              </div>
            </div>

            {/* CUSTOM NURSE TASK INPUT */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customNurseTask}
                onChange={(e) => setCustomNurseTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDelegateNurseTask(customNurseTask, true)}
                placeholder="Or type custom floor instruction (e.g. 'Re-check fetal heart rate in 15 mins')..."
                className="flex-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 font-medium"
              />
              <Button
                type="button"
                onClick={() => handleDelegateNurseTask(customNurseTask, true)}
                disabled={!customNurseTask.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl px-4 flex items-center gap-1 shadow-lg disabled:opacity-50"
              >
                <Plus size={14} /> Delegate Task
              </Button>
            </div>

            {/* LIVE NURSE FLOOR QUEUE WITH REAL-TIME CHECKMARKS */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase text-emerald-400 block">Active Nursing Floor Task Queue ({dbNurseTasks ? dbNurseTasks.length : 0}):</span>

              {dbNurseTasks && dbNurseTasks.length > 0 ? (
                dbNurseTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition-all ${
                      task.status === 'COMPLETED'
                        ? 'bg-slate-950/60 border-slate-800 text-slate-500 line-through'
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleNurseTaskStatus(task.id, task.status)}
                        className="text-emerald-400 hover:text-emerald-300 transition-all shrink-0"
                      >
                        {task.status === 'COMPLETED' ? (
                          <CheckSquare size={18} className="text-emerald-500" />
                        ) : (
                          <Square size={18} className="text-slate-600 hover:text-emerald-400" />
                        )}
                      </button>

                      <div>
                        <p className="text-xs font-bold flex items-center gap-2">
                          {task.taskDescription}
                          {task.isUrgent && task.status !== 'COMPLETED' && (
                            <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase">URGENT</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Assigned by: {task.assigningDoctorName} • {task.createdAt}
                          {task.completedBy && ` • Completed by ${task.completedBy} at ${task.completedAt}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteNurseTask(task.id)}
                      className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 font-medium">
                  No nurse tasks delegated yet. Click a shortcut above or enter a custom instruction.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
