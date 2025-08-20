
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { BookOtSessionDialog } from './components/book-ot-session-dialog';
import { OtScheduleDashboard } from './components/ot-schedule-dashboard';

export default function OTPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Operating Theatre Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage and schedule all surgical procedures.
                    </p>
                </div>
                <BookOtSessionDialog />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>OT Schedule</CardTitle>
                    <CardDescription>
                        A real-time timeline of all operating theatre bookings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OtScheduleDashboard />
                </CardContent>
            </Card>
        </div>
    );
}
