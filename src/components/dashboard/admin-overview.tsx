"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Stethoscope, Calendar, Hospital } from "lucide-react"

export function AdminOverview() {
  const stats = [
    { title: "Total Patients", value: "1,254", icon: Users },
    { title: "Appointments Today", value: "87", icon: Calendar },
    { title: "Doctors on Duty", value: "12", icon: Stethoscope },
    { title: "Available Beds", value: "45", icon: Hospital },
  ]

  return (
    <div>
        <h2 className="text-3xl font-bold tracking-tight mb-6 font-headline">Admin Dashboard</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
            <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">+2.1% from last month</p>
            </CardContent>
            </Card>
        ))}
        </div>
    </div>
  )
}
