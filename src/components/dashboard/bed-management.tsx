"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BedDouble, User, Wrench } from "lucide-react"
import type { Bed } from "@/lib/types"
import { allBeds } from "@/lib/data"
import { cn } from "@/lib/utils"

const statusConfig = {
    occupied: {
        icon: BedDouble,
        label: "Occupied",
        color: "bg-red-100 border-red-200 text-red-800",
        badge: "destructive" as const,
    },
    vacant: {
        icon: BedDouble,
        label: "Vacant",
        color: "bg-green-100 border-green-200 text-green-800",
        badge: "default" as const,
    },
    maintenance: {
        icon: Wrench,
        label: "Maintenance",
        color: "bg-yellow-100 border-yellow-200 text-yellow-800",
        badge: "secondary" as const,
    }
}


export function BedManagement() {
  const wards = [...new Set(allBeds.map(b => b.ward))];

  return (
     <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Bed Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            {wards.map(ward => (
                <div key={ward}>
                    <h3 className="text-lg font-semibold mb-3 font-headline">{ward} Ward</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {allBeds.filter(b => b.ward === ward).map(bed => {
                            const config = statusConfig[bed.status];
                            return (
                                <div key={bed.bedId} className={cn("rounded-lg border p-4 flex flex-col items-center justify-center space-y-2", config.color)}>
                                    <config.icon className="w-8 h-8"/>
                                    <p className="font-bold text-lg">{bed.bedId}</p>
                                    <Badge variant={config.badge}>{config.label}</Badge>
                                    {bed.status === 'occupied' && (
                                        <div className="flex items-center text-xs pt-1">
                                            <User className="w-3 h-3 mr-1" />
                                            <span>{bed.currentPatientId}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
  )
}
