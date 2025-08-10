
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { LabWorkQueue } from './components/lab-work-queue';

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
                <CardHeader>
                    <CardTitle>Lab Work Queue</CardTitle>
                    <CardDescription>
                        A real-time list of all ordered tests.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <LabWorkQueue />
                </CardContent>
            </Card>
        </div>
    );
}
