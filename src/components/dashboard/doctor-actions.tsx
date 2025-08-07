
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, FileText, Activity, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../auth-provider";
import * as React from "react";

export function DoctorActions() {
    const { user } = useAuth();
    
    const actions = [
        {
            href: "/doctor/patients",
            icon: Users,
            title: "My Patients",
            description: "Access the full list of patients in the hospital.",
        },
        {
            href: "/doctor/referrals",
            icon: Share2,
            title: "My Referrals",
            description: "View and manage all referrals assigned to you.",
        },
        {
            href: "#", // Placeholder for future surgery schedule page
            icon: Activity,
            title: "Today's Surgeries",
            description: "View the schedule for the operating theater.",
        }
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Doctor's Actions</CardTitle>
                <CardDescription>
                    Quick access to your most common tasks and workflows.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {actions.map((action, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <action.icon className="w-5 h-5 text-muted-foreground" />
                                {action.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">{action.description}</p>
                        </CardContent>
                        <div className="p-6 pt-0 flex justify-between items-center">
                             <Button asChild>
                                <Link href={action.href}>
                                    Open
                                </Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
}
