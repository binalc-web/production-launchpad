import React, { useState } from 'react';
import { Users, Search, MoreHorizontal, Mail, Phone, Calendar, Shield, Edit, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  avatar: string;
  status: 'active' | 'inactive' | 'pending';
  lastActive: string;
  joinDate: string;
  permissions: {
    canCreateMeetings: boolean;
    canEditMOMs: boolean;
    canManageUsers: boolean;
    canViewReports: boolean;
  };
  availability: 'available' | 'busy' | 'ooo';
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
}

interface UserManagementProps {
  currentUser: User;
}

export function UserManagement({ currentUser }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: ''
  });

  // Mock team members data
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@company.com',
      phone: '+1 (555) 123-4567',
      role: 'Team Lead',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      status: 'active',
      lastActive: '2025-07-14 09:30',
      joinDate: '2023-01-15',
      permissions: {
        canCreateMeetings: true,
        canEditMOMs: true,
        canManageUsers: true,
        canViewReports: true
      },
      availability: 'available',
      timezone: 'EST',
      workingHours: { start: '09:00', end: '17:00' }
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      phone: '+1 (555) 234-5678',
      role: 'Product Manager',
      department: 'Product',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      status: 'active',
      lastActive: '2025-07-14 10:15',
      joinDate: '2023-03-20',
      permissions: {
        canCreateMeetings: true,
        canEditMOMs: true,
        canManageUsers: false,
        canViewReports: true
      },
      availability: 'available',
      timezone: 'PST',
      workingHours: { start: '08:00', end: '16:00' }
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      phone: '+1 (555) 345-6789',
      role: 'Senior Developer',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      status: 'active',
      lastActive: '2025-07-14 08:45',
      joinDate: '2022-11-10',
      permissions: {
        canCreateMeetings: true,
        canEditMOMs: false,
        canManageUsers: false,
        canViewReports: false
      },
      availability: 'busy',
      timezone: 'EST',
      workingHours: { start: '10:00', end: '18:00' }
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      phone: '+1 (555) 456-7890',
      role: 'UX Designer',
      department: 'Design',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      status: 'active',
      lastActive: '2025-07-14 11:20',
      joinDate: '2023-06-05',
      permissions: {
        canCreateMeetings: true,
        canEditMOMs: false,
        canManageUsers: false,
        canViewReports: false
      },
      availability: 'available',
      timezone: 'CST',
      workingHours: { start: '09:30', end: '17:30' }
    },
    {
      id: '5',
      name: 'David Wilson',
      email: 'david.wilson@company.com',
      phone: '+1 (555) 567-8901',
      role: 'QA Engineer',
      department: 'Engineering',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      status: 'inactive',
      lastActive: '2025-07-10 16:30',
      joinDate: '2023-08-12',
      permissions: {
        canCreateMeetings: false,
        canEditMOMs: false,
        canManageUsers: false,
        canViewReports: false
      },
      availability: 'ooo',
      timezone: 'PST',
      workingHours: { start: '08:30', end: '16:30' }
    },
    {
      id: '6',
      name: 'Lisa Zhang',
      email: 'lisa.zhang@company.com',
      phone: '+1 (555) 678-9012',
      role: 'Data Analyst',
      department: 'Analytics',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
      status: 'pending',
      lastActive: '',
      joinDate: '2025-07-01',
      permissions: {
        canCreateMeetings: false,
        canEditMOMs: false,
        canManageUsers: false,
        canViewReports: true
      },
      availability: 'available',
      timezone: 'EST',
      workingHours: { start: '09:00', end: '17:00' }
    }
  ];

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getAvailabilityColor = (availability: TeamMember['availability']) => {
    switch (availability) {
      case 'available':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'busy':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'ooo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const roles = [...new Set(teamMembers.map(member => member.role))];
  const departments = [...new Set(teamMembers.map(member => member.department))];

  const addUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    toast.success(`Invitation sent to ${newUser.name}`);
    setIsAddUserOpen(false);
    setNewUser({ name: '', email: '', phone: '', role: '', department: '' });
  };

  const getUserStats = () => {
    const total = teamMembers.length;
    const active = teamMembers.filter(m => m.status === 'active').length;
    const available = teamMembers.filter(m => m.availability === 'available').length;
    const admins = teamMembers.filter(m => m.permissions.canManageUsers).length;

    return { total, active, available, admins };
  };

  const stats = getUserStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Team Management</h2>
          <p className="text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to add a new member to your team. They will receive an email with setup instructions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Name *</Label>
                  <Input
                    id="userName"
                    placeholder="Enter full name"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="Enter email address"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userPhone">Phone</Label>
                  <Input
                    id="userPhone"
                    placeholder="Enter phone number"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userRole">Role *</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userDepartment">Department</Label>
                <Select value={newUser.department} onValueChange={(value) => setNewUser(prev => ({ ...prev, department: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addUser}>
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-xl font-semibold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-emerald-600 rounded-full" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-xl font-semibold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-emerald-600 rounded-full" />
              <div>
                <p className="text-sm text-muted-foreground">Available Now</p>
                <p className="text-xl font-semibold">{stats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-xl font-semibold">{stats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{member.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                    <p className="text-xs text-muted-foreground">{member.department}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Permissions
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className={getStatusColor(member.status)}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </Badge>
                <Badge variant="secondary" className={getAvailabilityColor(member.availability)}>
                  {member.availability === 'ooo' ? 'Out of Office' : member.availability.charAt(0).toUpperCase() + member.availability.slice(1)}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {new Date(member.joinDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Working Hours ({member.timezone})</p>
                <p className="text-sm">{member.workingHours.start} - {member.workingHours.end}</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Permissions</p>
                <div className="flex flex-wrap gap-1">
                  {member.permissions.canCreateMeetings && (
                    <Badge variant="outline" className="text-xs">Create Meetings</Badge>
                  )}
                  {member.permissions.canEditMOMs && (
                    <Badge variant="outline" className="text-xs">Edit MOMs</Badge>
                  )}
                  {member.permissions.canManageUsers && (
                    <Badge variant="outline" className="text-xs">Manage Users</Badge>
                  )}
                  {member.permissions.canViewReports && (
                    <Badge variant="outline" className="text-xs">View Reports</Badge>
                  )}
                </div>
              </div>

              {member.lastActive && (
                <div className="text-xs text-muted-foreground">
                  Last active: {new Date(member.lastActive).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}