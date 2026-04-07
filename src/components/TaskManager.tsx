import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertCircle, User, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: string;
  source?: 'ai_assistant' | 'manual' | 'meeting';
}

interface TaskManagerProps {
  currentUser: any;
  onTaskUpdate?: (task: Task) => void;
}

export function TaskManager({ currentUser, onTaskUpdate }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task-1',
      title: 'Review API documentation',
      description: 'Complete review of the new API endpoints documentation',
      assignee: currentUser?.name || 'Current User',
      dueDate: '2025-01-30',
      status: 'pending',
      priority: 'medium',
      createdBy: currentUser?.name || 'Current User',
      createdAt: '2025-01-24T10:00:00Z',
      source: 'manual'
    },
    {
      id: 'task-2',
      title: 'Schedule follow-up with client',
      description: 'Follow up on the project timeline discussion',
      assignee: currentUser?.name || 'Current User',
      dueDate: '2025-01-28',
      status: 'in_progress',
      priority: 'high',
      createdBy: 'AI Assistant',
      createdAt: '2025-01-24T09:30:00Z',
      source: 'ai_assistant'
    }
  ]);

  const addTask = (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setTasks(prev => [task, ...prev]);
    onTaskUpdate?.(task);
    return task;
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3" />;
      case 'in_progress': return <Clock className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  // Expose addTask method for AI Assistant to use
  React.useImperativeHandle(
    React.createRef(),
    () => ({
      addTask
    }),
    [addTask]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Action Items & Tasks</h3>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.source === 'ai_assistant' && (
                      <Badge variant="secondary" className="text-xs">
                        AI Created
                      </Badge>
                    )}
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{task.assignee}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex space-x-2">
                    <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  
                  {task.status !== 'completed' && (
                    <div className="flex space-x-1">
                      {task.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        >
                          Start
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Complete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {tasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
              <p className="text-muted-foreground">
                Tasks created via AI Assistant or manual entry will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Export the component and also export a context for global task management
export const TaskContext = React.createContext<{
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
  tasks: Task[];
} | null>(null);