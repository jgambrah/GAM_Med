'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from 'date-fns';
import { Hospital, Zap } from "lucide-react";

type HospitalFeedItem = {
    id: string;
    name: string;
    createdAt?: {
        toDate: () => Date;
    };
};

interface LiveFeedProps {
    hospitals: HospitalFeedItem[] | null;
}

export function LiveFeed({ hospitals }: LiveFeedProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="text-primary" />
                    Recent Deployments
                </CardTitle>
                <CardDescription>The last 3 facilities onboarded to the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {!hospitals ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-start gap-4">
                                <Skeleton className="h-9 w-9 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-3 w-2/5" />
                                </div>
                            </div>
                        ))
                    ) : hospitals.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No recent deployments.
                        </div>
                    ) : (
                        hospitals.map(hospital => (
                            <div key={hospital.id} className="flex items-start gap-4">
                                <div className="bg-primary/10 p-2 rounded-full">
                                    <Hospital className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{hospital.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Onboarded {hospital.createdAt ? formatDistanceToNow(hospital.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
