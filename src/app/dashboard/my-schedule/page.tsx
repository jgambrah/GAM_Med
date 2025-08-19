
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScheduleCalendar } from './components/schedule-calendar';
import { LeaveRequestDialog } from './components/leave-request-dialog';

export default function MySchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">My Schedule</h1>
            <p className="text-muted-foreground">
                View and manage your weekly availability and leave requests.
            </p>
        </div>
        <LeaveRequestDialog />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>
            Click and drag on the calendar to block out unavailable times or create new availability slots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleCalendar />
        </CardContent>
      </Card>
    </div>
  );
}
