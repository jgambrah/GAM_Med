"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/lib/types";

export function MockRoleSwitcher() {
  const { user, setMockUserRole } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-card p-4 shadow-lg">
      <div className="grid gap-2">
        <Label className="text-sm font-medium">Mock Role</Label>
        <div className="flex items-center gap-2">
          <Select
            value={user.role}
            onValueChange={(value) => setMockUserRole(value as UserRole)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Doctor">Doctor</SelectItem>
              <SelectItem value="Nurse">Nurse</SelectItem>
              <SelectItem value="Pharmacist">Pharmacist</SelectItem>
              <SelectItem value="Patient">Patient</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          App is in mock mode. Firebase is not configured.
        </p>
      </div>
    </div>
  );
}
