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
import { allUsers } from '@/lib/data';
import { User } from '@/lib/types';
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

export function StaffDirectoryDashboard() {
  const [users, setUsers] = React.useState<User[]>(allUsers);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('All');
  const [departmentFilter, setDepartmentFilter] = React.useState('All');

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

  return (
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
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                  <TableCell>{user.department || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'secondary' : 'outline'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/hr/${user.uid}`}>
                          View Details
                        </Link>
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// Rename the component to avoid confusion
export { StaffDirectoryDashboard as StaffManagementDashboard };
