import React, { useState } from 'react';
import { Calendar, Eye, EyeOff, Users, Settings, FileText, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from "sonner@2.0.3";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface AuthProps {
  onLogin: (user: User) => void;
}

const ROLE_PERMISSIONS = {
  'Engineering Manager': {
    description: 'Full access to all features including direct Jira ticket creation and Confluence documentation',
    permissions: [
      'Track and view all meetings',
      'Create and schedule meetings',
      'Access all meeting notes and documentation',
      'Create Jira tickets directly in Jira',
      'Create Confluence documentation',
      'Manage integrations',
      'Full administrative access'
    ],
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: <Settings className="h-4 w-4" />
  },
  'Product Manager': {
    description: 'Full access to all features including direct Jira ticket creation and Confluence documentation',
    permissions: [
      'Track and view all meetings',
      'Create and schedule meetings',
      'Access all meeting notes and documentation',
      'Create Jira tickets directly in Jira',
      'Create Confluence documentation',
      'Manage integrations',
      'Full administrative access'
    ],
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: <FileText className="h-4 w-4" />
  },
  'UI/UX Lead': {
    description: 'Full access except direct Jira ticket creation, can create Confluence documentation',
    permissions: [
      'Track and view all meetings',
      'Create and schedule meetings',
      'Access all meeting notes and documentation',
      'Create Confluence documentation',
      'Manage integrations',
      'Request Jira tickets through Meeting Tracker'
    ],
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    icon: <Users className="h-4 w-4" />
  },
  'Team Lead': {
    description: 'Create Jira tickets in Meeting Tracker, create subtasks for existing EPICs/Stories',
    permissions: [
      'Track and view all meetings',
      'Create and schedule meetings',
      'Access all meeting notes and documentation',
      'Create Jira tickets in Meeting Tracker',
      'Create subtasks for existing EPICs/User Stories',
      'Create Confluence documentation',
      'Request PM approval for new EPICs/Stories'
    ],
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: <CheckSquare className="h-4 w-4" />
  },
  'Employee': {
    description: 'Track meetings and access detailed meeting notes for assigned projects',
    permissions: [
      'Track meetings for assigned projects',
      'View meeting notes for own projects',
      'Access meeting details and action items',
      'View project-related documentation',
      'Participate in meetings as attendee'
    ],
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    icon: <Calendar className="h-4 w-4" />
  }
};

export function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      // Signup validation
      if (!formData.name || !formData.email || !formData.password || !formData.role) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    } else {
      // Login validation
      if (!formData.email || !formData.password) {
        toast.error('Please enter email and password');
        return;
      }
    }

    // Simulate authentication
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: isLogin ? 'John Smith' : formData.name,
      email: formData.email,
      role: isLogin ? 'Team Lead' : formData.role,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    };

    toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    onLogin(user);
  };

  const getRolePermissions = (role: string) => {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || ROLE_PERMISSIONS['Employee'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding and Features */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-6">
              <Calendar className="h-12 w-12 text-primary" />
              <h1 className="text-4xl font-bold">MeetingTracker</h1>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Comprehensive Meeting Tracking & Management</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Track meetings, manage action items, and collaborate seamlessly with integrated tools like Jira, Confluence, and Zoom.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Meeting Tracking</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Track all your meetings, participants, and outcomes in one centralized dashboard.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">AI-Powered Notes</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically generate meeting summaries and action items with AI assistance.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Jira Integration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create tickets and manage project tasks directly from meeting outcomes.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-medium">Team Collaboration</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Role-based access ensures everyone gets the right level of information and control.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Authentication Form */}
        <Card className="w-full max-w-md mx-auto bg-card/80 backdrop-blur-sm border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome Back' : 'Join MeetingTracker'}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Sign in to access your meeting dashboard' 
                : 'Create your account to start tracking meetings'
              }
            </p>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'signup'} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="login" 
                  onClick={() => setIsLogin(true)}
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  onClick={() => setIsLogin(false)}
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4">
                <TabsContent value="signup" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_PERMISSIONS).map(([role, config]) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center space-x-2">
                              {config.icon}
                              <span>{role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.role && (
                    <Card className="bg-muted/50">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="secondary" className={getRolePermissions(formData.role).color}>
                            {getRolePermissions(formData.role).icon}
                            <span className="ml-1">{formData.role}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {getRolePermissions(formData.role).description}
                        </p>
                        <div className="space-y-1">
                          {getRolePermissions(formData.role).permissions.slice(0, 3).map((permission, index) => (
                            <p key={index} className="text-xs text-muted-foreground">
                              • {permission}
                            </p>
                          ))}
                          {getRolePermissions(formData.role).permissions.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              + {getRolePermissions(formData.role).permissions.length - 3} more permissions
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <TabsContent value="signup" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                </TabsContent>

                <Button type="submit" className="w-full">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              {/* Demo Login */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center mb-3">
                  Quick Demo Access:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, email: 'manager@company.com', password: 'demo123' }));
                      const user: User = {
                        id: '1',
                        name: 'Alex Johnson',
                        email: 'manager@company.com',
                        role: 'Engineering Manager',
                        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
                      };
                      onLogin(user);
                    }}
                  >
                    Manager Demo
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, email: 'employee@company.com', password: 'demo123' }));
                      const user: User = {
                        id: '2',
                        name: 'Sarah Wilson',
                        email: 'employee@company.com',
                        role: 'Employee',
                        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
                      };
                      onLogin(user);
                    }}
                  >
                    Employee Demo
                  </Button>
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}