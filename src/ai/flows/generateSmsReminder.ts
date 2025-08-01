'use server';
/**
 * @fileOverview A flow for generating appointment reminder SMS messages.
 *
 * - generateSmsReminder - A function that handles generating the SMS.
 * - GenerateSmsReminderInput - The input type for the generateSmsReminder function.
 * - GenerateSmsReminderOutput - The return type for the generateSmsReminder function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AppointmentSchema = z.object({
  id: z.string(),
  patientName: z.string(),
  doctorName: z.string(),
  date: z.string(),
  time: z.string(),
  reason: z.string(),
  status: z.string(),
});

const GenerateSmsReminderInputSchema = z.object({
  role: z.string(),
  userName: z.string(),
  appointments: z.array(AppointmentSchema),
});
export type GenerateSmsReminderInput = z.infer<
  typeof GenerateSmsReminderInputSchema
>;

const GenerateSmsReminderOutputSchema = z.string();
export type GenerateSmsReminderOutput = z.infer<
  typeof GenerateSmsReminderOutputSchema
>;

export async function generateSmsReminder(
  input: GenerateSmsReminderInput
): Promise<GenerateSmsReminderOutput> {
  return generateSmsReminderFlow(input);
}

const generateSmsReminderFlow = ai.defineFlow(
  {
    name: 'generateSmsReminderFlow',
    inputSchema: GenerateSmsReminderInputSchema,
    outputSchema: GenerateSmsReminderOutputSchema,
  },
  async ({role, userName, appointments}) => {
    // This is a mock implementation as the real one is assumed to be pre-existing.
    if (appointments.length === 0) {
      return `Hi ${userName}, you have no upcoming appointments.`;
    }

    const upcomingAppointments = appointments.filter(a => {
      // Create a date object that is timezone-agnostic for comparison
      const [year, month, day] = a.date.split('-').map(Number);
      const appointmentDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day
      return appointmentDate >= today;
    });

    if (upcomingAppointments.length === 0) {
      return `Hi ${userName}, you have no more appointments today or in the future.`;
    }

    const nextAppointment = upcomingAppointments.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    })[0];

    if (role === 'Patient') {
      return `Hi ${userName}, a reminder for your appointment with Dr. ${nextAppointment.doctorName} on ${nextAppointment.date} at ${nextAppointment.time}. Regards, MedFlow GH.`;
    }
    if (role === 'Doctor') {
      return `Hi Dr. ${userName}, you have ${
        upcomingAppointments.length
      } appointments. Your next is with ${
        nextAppointment.patientName
      } at ${nextAppointment.time}. Regards, MedFlow GH.`;
    }
    if (role === 'Nurse') {
      return `Hi ${userName}, there are ${upcomingAppointments.length} upcoming appointments. The next is for patient ${nextAppointment.patientName} with Dr. ${nextAppointment.doctorName} at ${nextAppointment.time}. Regards, MedFlow GH.`;
    }

    return `Hi ${userName}, you have ${upcomingAppointments.length} upcoming events. Regards, MedFlow GH.`;
  }
);