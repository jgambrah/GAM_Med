"use server";

import { generateSmsReminder } from "@/ai/flows/generateSmsReminder";
import type { Appointment, User } from "./types";

export async function getSmsReminderAction(
  role: User["role"],
  userName: string,
  appointments: Appointment[]
) {
  try {
    const sms = await generateSmsReminder({
      role,
      userName,
      appointments: appointments.map((a) => ({
        id: a.id,
        patientName: a.patientName,
        doctorName: a.doctorName,
        date: a.date,
        time: a.time,
        reason: a.reason,
        status: a.status,
      })),
    });
    return { success: true, message: sms };
  } catch (error) {
    console.error("Error running generateSmsReminder flow:", error);
    return {
      success: false,
      message: "Failed to generate reminder. Please try again later.",
    };
  }
}
