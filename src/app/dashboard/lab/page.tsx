

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LabWorkQueue } from './components/lab-work-queue';
import { SampleTrackingDashboard } from './components/sample-tracking-dashboard';
import { EquipmentLogDashboard } from './components/equipment-log-dashboard';

export default function LabPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Laboratory Dashboard</h1>
                <p className="text-muted-foreground">
                    Manage and process all incoming laboratory test requests.
                </p>
            </div>
            <Card>
                <Tabs defaultValue="work-queue">
                    <CardHeader>
                        <TabsList className="h-auto flex-wrap justify-start">
                            <TabsTrigger value="work-queue">Lab Work Queue</TabsTrigger>
                            <TabsTrigger value="sample-tracking">Sample Tracking</TabsTrigger>
                            <TabsTrigger value="equipment-logs">Equipment Logs</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <TabsContent value="work-queue">
                         <CardHeader className="pt-0">
                            <CardTitle>Lab Work Queue</CardTitle>
                            <CardDescription>
                                A real-time list of all ordered tests.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LabWorkQueue />
                        </CardContent>
                    </TabsContent>
                    <TabsContent value="sample-tracking">
                        <CardHeader className="pt-0">
                            <CardTitle>Sample Tracking</CardTitle>
                            <CardDescription>
                                Track a sample's journey using its barcode.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <SampleTrackingDashboard />
                        </CardContent>
                    </TabsContent>
                     <TabsContent value="equipment-logs">
                        <CardHeader className="pt-0">
                            <CardTitle>Equipment Logs</CardTitle>
                            <CardDescription>
                                A real-time stream of data from integrated lab equipment.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <EquipmentLogDashboard />
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}
