'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { allUsers, mockStaffProfiles } from '@/lib/data';
import { User, StaffProfile } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { useDebouncedCallback } from 'use-debounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddUserDialog } from './add-user-dialog';
import Link from 'next/link';
import { EditLeaveBalancesDialog } from '../staff/[staffId]/components/edit-leave-balances-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { toast } from '@/hooks/use-toast';

export function StaffDirectoryDashboard() {
  const [users, setUsers] = React.useState<User[]>(allUsers);
  const [staffProfiles, setStaffProfiles] = useLocalStorage<StaffProfile[]>('staffProfiles', mockStaffProfiles);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All');
  const [departmentFilter, setDepartmentFilter] = React.useState('All');
  const [userToEditLeave, setUserToEditLeave] = React.useState<StaffProfile | null>(null);

  const departments = [...new Set(allUsers.map(u => u.department).filter(Boolean))];
  const roles = [...new Set(allUsers.map(u => u.role))];

  const filterUsers = useDebouncedCallback(() => {
    let filtered = allUsers;

    if (searchQuery) {
        filtered = filtered.filter(user => 
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    if (roleFilter !== 'All') {
        filtered = filtered.filter(user => user.role === roleFilter);
    }
    if (departmentFilter !== 'All') {
        filtered = filtered.filter(user => user.department === departmentFilter);
    }
    
    setUsers(filtered);
  }, 300);

  React.useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, departmentFilter, filterUsers]);
  
  const handleUserCreated = (newUser: User) => {
    // In a real app, we would re-fetch or simply update the state
    setUsers(prev => [newUser, ...prev]);
  }

  const handleBalancesSaved = (staffId: string, newBalances: Record<string, number>) => {
    setStaffProfiles(prevProfiles => prevProfiles.map(p => 
      p.staffId === staffId ? { ...p, leaveBalances: newBalances } : p
    ));
    toast.success("Leave balances have been updated successfully.");
    setUserToEditLeave(null);
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            A comprehensive list of all hospital staff.
          </CardDescription>
        </div>
        <AddUserDialog onUserCreated={handleUserCreated}/>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-4">
             <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by role..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    {roles.map(role => <SelectItem key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by department..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All">All Departments</SelectItem>
                    {departments.filter((dep): dep is string => !!dep).map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Leave Actions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const profile = staffProfiles.find(p => p.staffId === user.uid);
                return (
                    <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                    <TableCell>{user.department || 'N/A'}</TableCell>
                    <TableCell>
                        {profile && (
                            <Button variant="outline" size="sm" onClick={() => setUserToEditLeave(profile)}>
                                Edit Leave
                            </Button>
                        )}
                    </TableCell>
                    <TableCell>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/hr/staff/${user.uid}`}>
                            View Details
                            </Link>
                        </Button>
                    </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    {userToEditLeave && (
        <EditLeaveBalancesDialog
            isOpen={!!userToEditLeave}
            onOpenChange={(isOpen) => !isOpen && setUserToEditLeave(null)}
            balances={userToEditLeave.leaveBalances || {}}
            onSave={(newBalances) => handleBalancesSaved(userToEditLeave.staffId, newBalances)}
        />
    )}
    </>
  );
}

// Rename the component to avoid confusion
export { StaffDirectoryDashboard as StaffManagementDashboard };
