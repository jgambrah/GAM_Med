
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { BookOtSessionDialog } from './components/book-ot-session-dialog';
import { OtScheduleDashboard } from './components/ot-schedule-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecoveryDashboard } from './components/recovery-dashboard';

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
             <Tabs defaultValue="schedule">
                <TabsList>
                    <TabsTrigger value="schedule">OT Schedule</TabsTrigger>
                    <TabsTrigger value="recovery">Post-Op Recovery</TabsTrigger>
                </TabsList>
                <TabsContent value="schedule" className="mt-4">
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
                </TabsContent>
                <TabsContent value="recovery" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Post-Operative Recovery Dashboard</CardTitle>
                            <CardDescription>
                                A list of all patients currently in the recovery unit (PACU).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RecoveryDashboard />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
