import { z } from 'zod';

export const EConsultRequestSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  requestingDoctorName: z.string(),
  taggedSpecialty: z.string(),
  clinicalQuestion: z.string(),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']),
  specialistOpinion: z.string().optional(),
  specialistName: z.string().optional(),
  signedAt: z.string().optional(),
  status: z.enum(['PENDING', 'REVIEWED', 'SIGNED']),
  createdAt: z.string(),
});

export const NurseTaskSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  patientName: z.string(),
  assigningDoctorName: z.string(),
  category: z.enum(['VITAL_CHECK', 'MEDICATION', 'MONITORING', 'LAB_DRAW', 'GENERAL']),
  taskDescription: z.string(),
  isUrgent: z.boolean().default(false),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
  completedBy: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
});

export type EConsultRequest = z.infer<typeof EConsultRequestSchema>;
export type NurseTask = z.infer<typeof NurseTaskSchema>;

export function getAvailableSpecialtyTags(): { id: string; name: string; icon: string }[] {
  return [
    { id: 'OBGYN', name: 'Obstetrics & Gynecology', icon: 'Baby' },
    { id: 'CARDIOLOGY', name: 'Cardiology & Heart Care', icon: 'Heart' },
    { id: 'PEDIATRICS', name: 'Pediatrics & Neonatology', icon: 'Sparkles' },
    { id: 'GENERAL_SURGERY', name: 'General & Trauma Surgery', icon: 'Scissors' },
    { id: 'NEPHROLOGY', name: 'Nephrology & Renal Medicine', icon: 'Activity' },
    { id: 'INTERNAL_MEDICINE', name: 'Internal Medicine & Infectious Disease', icon: 'Stethoscope' },
  ];
}

export function getPresetNurseMicroTasks(): { category: NurseTask['category']; description: string; isUrgent: boolean }[] {
  return [
    { category: 'VITAL_CHECK', description: 'Re-check Blood Pressure (BP) & Pulse in 30 minutes', isUrgent: true },
    { category: 'MEDICATION', description: 'Administer IM Syntocinon 10 IU STAT', isUrgent: true },
    { category: 'VITAL_CHECK', description: 'Check Random Blood Glucose (RBG) & Log Result', isUrgent: false },
    { category: 'MEDICATION', description: 'Administer IV Normal Saline 500mL Bolus over 1 hour', isUrgent: true },
    { category: 'MONITORING', description: 'Monitor Fetal Heart Rate (FHR) Q15M & Log on CTG Chart', isUrgent: true },
    { category: 'LAB_DRAW', description: 'Draw STAT Full Blood Count (FBC) & Blood Grouping', isUrgent: true },
  ];
}
