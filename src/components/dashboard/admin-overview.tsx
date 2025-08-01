"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Stethoscope, Calendar, Hospital, UserPlus } from "lucide-react"
import type { Patient } from "@/lib/types"
import { Button } from "../ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PatientRegistrationForm } from "./patient-registration-form"
import * as React from "react"
import { PatientsList } from "./patients-list"
import { allBeds } from "@/lib/data"

export function AdminOverview({ patients }: { patients: Patient[] }) {
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const availableBeds = allBeds.filter(b => b.status === 'vacant').length;

  const stats = [
    { title: "Total Patients", value: patients.length, icon: Users },
    { title: "Appointments Today", value: "87", icon: Calendar },
    { title: "Doctors on Duty", value: "12", icon: Stethoscope },
    { title: "Available Beds", value: availableBeds, icon: Hospital },
  ]

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h2>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register New Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>New Patient Registration</DialogTitle>
                  <DialogDescription>
                    Fill out the form below to register a new patient in the system.
                  </DialogDescription>
                </DialogHeader>
                <PatientRegistrationForm onFormSubmit={() => setIsFormOpen(false)} />
              </DialogContent>
            </Dialog>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
            <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {/* <p className="text-xs text-muted-foreground">+2.1% from last month</p> */}
            </CardContent>
            </Card>
        ))}
        </div>

        <PatientsList patients={patients} />
    </div>
  )
}
