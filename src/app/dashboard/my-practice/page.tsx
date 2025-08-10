
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DoctorAppointments } from '../components/doctor-appointments';
import { ReferralsDashboard } from '../referrals/components/referrals-dashboard';

export default function MyPracticePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Practice</h1>
        <p className="text-muted-foreground">
          Your personal dashboard for managing appointments and assigned referrals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
            <DoctorAppointments />
        </div>
        <div>
           <Card>
                <CardHeader>
                    <CardTitle>My Assigned Referrals</CardTitle>
                    <CardDescription>
                        A list of all patient referrals assigned to you for review.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ReferralsDashboard />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
