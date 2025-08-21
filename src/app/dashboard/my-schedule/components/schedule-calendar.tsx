
'use client';

import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { addDays, format, startOfWeek } from 'date-fns';

/**
 * == Conceptual UI: Doctor's Schedule Calendar ==
 *
 * This component provides the visual interface for doctors to manage their weekly schedule.
 * It's a simplified representation of what a full-featured calendar component (like
 * `react-big-calendar` or a custom-built one) would accomplish.
 *
 * Key Concepts:
 * - **Data Fetching**: On load, it would call the `getDoctorAvailability` Cloud Function
 *   for each day in the current week to fetch the `availableSlots` and `unavailablePeriods`.
 * - **Interactive Editing**: In a full implementation, the time slots would be interactive.
 *   - Users could click and drag on an empty area to create a new `availableSlot`.
 *   - They could drag the edges of existing slots to resize them.
 *   - Clicking an existing slot could open a popover to edit or delete it.
 * - **State Management**: Each interaction would update the component's local state. A "Save
 *   Changes" button would then call the `updateDoctorSchedule` Cloud Function to persist
 *   the changes for the week.
 */
export function ScheduleCalendar() {
  const { user } = useAuth();
  
  // For demonstration, we'll build a simple 5-day week view (Mon-Fri)
  const weekStartsOn = 1; // Monday
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn });

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  type ScheduleInfo = {
    type: 'available' | 'unavailable' | 'booked';
    reason?: string;
    patient?: string;
  };
  
  // In a real app, this would be fetched from Firestore via `getDoctorAvailability`
  const mockSchedule: { [key: string]: ScheduleInfo } = {
    '09:00': { type: 'available' },
    '10:00': { type: 'available' },
    '11:00': { type: 'available' },
    '12:00': { type: 'unavailable', reason: 'Lunch' },
    '13:00': { type: 'booked', patient: 'Aba Appiah' },
    '14:00': { type: 'available' },
    '15:00': { type: 'available' },
  };

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-6">
        {/* Time column */}
        <div className="p-2 border-r bg-muted/50">
          <span className="sr-only">Time</span>
        </div>
        {/* Day columns */}
        {days.map(day => (
          <div key={day.toString()} className="p-2 text-center font-semibold border-b">
            <div>{format(day, 'EEE')}</div>
            <div className="text-sm text-muted-foreground">{format(day, 'd MMM')}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 grid-rows-10">
        {/* Time column content */}
        <div className="col-start-1 row-span-full grid grid-rows-10 border-r bg-muted/50">
            {timeSlots.map(time => (
                 <div key={time} className="flex items-center justify-center border-b p-2 text-xs text-muted-foreground">
                    {time}
                </div>
            ))}
        </div>
        {/* Schedule grid */}
        <div className="col-start-2 col-span-5 row-span-full grid grid-cols-5 grid-rows-10">
            {days.map((day, dayIndex) => (
                 <div key={dayIndex} className={cn("grid grid-rows-10", dayIndex < 4 && "border-r")}>
                    {timeSlots.map((time, timeIndex) => {
                        const slotInfo = (dayIndex === 1 && mockSchedule[time]); // Mock data only on Tuesday for demo
                        return (
                            <div
                                key={timeIndex}
                                className={cn(
                                    "border-b p-1 text-xs cursor-pointer hover:bg-accent/50 transition-colors",
                                    slotInfo?.type === 'available' && "bg-green-100",
                                    slotInfo?.type === 'unavailable' && "bg-slate-200",
                                    slotInfo?.type === 'booked' && "bg-blue-100",
                                )}
                            >
                               {slotInfo?.type === 'unavailable' && <span>{slotInfo.reason}</span>}
                               {slotInfo?.type === 'booked' && <span className="font-semibold">{slotInfo.patient}</span>}
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
