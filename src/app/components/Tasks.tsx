import { useState } from "react";
import { useNavigate } from "react-router";
import { Bot, User, AlertCircle, Clock, CheckCircle2, Calendar } from "lucide-react";
import { tasks } from "../data/mockData";

export function Tasks() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTasks = statusFilter === "all"
    ? tasks
    : tasks.filter(t => {
        if (statusFilter === "agent") return t.assigneeType === "agent";
        if (statusFilter === "pending-review") return t.status === "Agent Completed";
        if (statusFilter === "action-required") return t.status === "Action Required";
        return t.status === statusFilter;
      });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Agent Completed": return "bg-purple-100 text-purple-700";
      case "In Progress": return "bg-blue-100 text-blue-700";
      case "Pending": return "bg-gray-100 text-gray-700";
      case "Scheduled": return "bg-orange-100 text-orange-700";
      case "Action Required": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "text-red-600";
      case "Medium": return "text-orange-600";
      case "Low": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
        <p className="text-gray-600 mt-1">Manage your workflow and AI agent assignments</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 mr-2">Filter:</span>
          {[
            { value: "all", label: "All Tasks" },
            { value: "agent", label: "AI Agent Tasks" },
            { value: "pending-review", label: "Pending Review" },
            { value: "action-required", label: "Action Required" },
            { value: "In Progress", label: "In Progress" },
            { value: "Scheduled", label: "Scheduled" }
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Task Name</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Client</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Due Date</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Assignee</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Priority</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTasks.map(task => (
              <tr
                key={task.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {task.assigneeType === "agent" && (
                      <Bot className="w-4 h-4 text-blue-600" />
                    )}
                    <span className="text-sm text-gray-900">{task.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{task.client}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Calendar className="w-4 h-4" />
                    {new Date(task.dueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {task.assigneeType === "agent" ? (
                      <>
                        <Bot className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-700 font-medium">{task.assignee}</span>
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">{task.assignee}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {task.status === "Agent Completed" && (
                    <span className="text-xs text-purple-600 font-medium">Review →</span>
                  )}
                  {task.status === "Action Required" && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  {task.status === "Scheduled" && (
                    <Clock className="w-5 h-5 text-orange-600" />
                  )}
                  {task.status === "In Progress" && task.assigneeType === "agent" && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-600">Running</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-700">AI Agent Tasks</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {tasks.filter(t => t.assigneeType === "agent").length}
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-700">Pending Review</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {tasks.filter(t => t.status === "Agent Completed").length}
          </p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-700">Action Required</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {tasks.filter(t => t.status === "Action Required").length}
          </p>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-700">Scheduled</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">
            {tasks.filter(t => t.status === "Scheduled").length}
          </p>
        </div>
      </div>
    </div>
  );
}
