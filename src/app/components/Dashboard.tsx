import { useNavigate } from "react-router";
import { Calendar, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { tasks, meetings } from "../data/mockData";

export function Dashboard() {
  const navigate = useNavigate();
  const pendingTasks = tasks.filter(t => t.status === "Pending" || t.status === "In Progress").length;
  const agentTasks = tasks.filter(t => t.assigneeType === "agent").length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, John. Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Clients</p>
              <p className="text-2xl font-semibold mt-1">12</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasks Due This Week</p>
              <p className="text-2xl font-semibold mt-1">{pendingTasks}</p>
            </div>
            <Calendar className="w-10 h-10 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI Agent Tasks</p>
              <p className="text-2xl font-semibold mt-1">{agentTasks}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Today</p>
              <p className="text-2xl font-semibold mt-1">3</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent AI Activity</h2>
          <div className="space-y-3">
            {meetings.map(meeting => (
              <button
                key={meeting.id}
                onClick={() => navigate(`/ai-hub/meeting/${meeting.id}`)}
                className="w-full text-left p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{meeting.clientName}</span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {meeting.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(meeting.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/ai-hub')}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View all AI activity →
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Tasks Pending Review</h2>
          <div className="space-y-3">
            {tasks.filter(t => t.status === "Agent Completed").map(task => (
              <button
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="w-full text-left p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{task.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{task.client}</span>
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                    Review Needed
                  </span>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/tasks')}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View all tasks →
          </button>
        </div>
      </div>
    </div>
  );
}
