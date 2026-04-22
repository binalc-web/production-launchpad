import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, AlertCircle, ExternalLink, Calendar, User, Bot, FileText, MessageSquare, Clock } from "lucide-react";
import { tasks } from "../data/mockData";
import { toast } from "sonner";

export function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const task = tasks.find(t => t.id === taskId);
  const [comment, setComment] = useState("");

  if (!task) {
    return <div className="p-8">Task not found</div>;
  }

  const handleApprove = () => {
    toast.success("Task approved", {
      description: "The task has been marked as complete"
    });
  };

  const handleRequestChanges = () => {
    if (!comment) {
      toast.error("Please add a comment explaining the changes needed");
      return;
    }
    toast.info("Changes requested", {
      description: "The agent will be notified"
    });
  };

  const isAgentCompleted = task.status === "Agent Completed";
  const isActionRequired = task.status === "Action Required";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tasks
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {task.assigneeType === "agent" && (
                  <Bot className="w-6 h-6 text-blue-600" />
                )}
                <h1 className="text-2xl font-semibold text-gray-900">{task.name}</h1>
              </div>
              <p className="text-gray-600">{task.client}</p>
            </div>
            <span className={`px-4 py-2 rounded-lg font-medium ${
              isAgentCompleted ? "bg-purple-100 text-purple-700" :
              isActionRequired ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"
            }`}>
              {task.status}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">Due Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-900">
                  {new Date(task.dueDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Assignee</p>
              <div className="flex items-center gap-2">
                {task.assigneeType === "agent" ? (
                  <>
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">{task.assignee}</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">{task.assignee}</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Priority</p>
              <span className={`text-sm font-medium ${
                task.priority === "High" ? "text-red-600" :
                task.priority === "Medium" ? "text-orange-600" :
                "text-gray-600"
              }`}>
                {task.priority}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Type</p>
              <span className="text-sm text-gray-900">
                {task.assigneeType === "agent" ? "AI Automated" : "Manual"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Execution Details */}
      {task.agentExecution && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Success State */}
            {isAgentCompleted && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h2 className="font-semibold text-gray-900">Agent Execution Complete</h2>
                </div>

                {/* Four-Step Annotations */}
                <div className="space-y-6">
                  {task.agentExecution.annotations?.map((annotation, i) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        {annotation.type === "status" && <FileText className="w-4 h-4 text-blue-600" />}
                        {annotation.type === "completion-note" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {annotation.type === "observations" && <MessageSquare className="w-4 h-4 text-purple-600" />}
                        {annotation.type === "output-link" && <ExternalLink className="w-4 h-4 text-orange-600" />}
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {annotation.type.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {annotation.content}
                      </div>
                      {annotation.link && (
                        <a
                          href={annotation.link}
                          className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-flex items-center gap-1"
                        >
                          Open file <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-200">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Completed at {new Date(task.agentExecution.completionTime!).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Failure State */}
            {isActionRequired && task.agentExecution.error && (
              <div className="bg-white rounded-lg border border-red-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <h2 className="font-semibold text-gray-900">Action Required</h2>
                </div>

                <div className="bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-900 mb-1">Error Message:</p>
                  <p className="text-sm text-red-700">{task.agentExecution.error.message}</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">@{task.agentExecution.error.mentionedUser}</span> has been notified via email
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Failed at {new Date(task.agentExecution.startTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}

            {/* Review Actions */}
            {isAgentCompleted && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Review & Approve</h3>

                <div className="mb-4">
                  <label className="text-sm text-gray-700 mb-2 block">Add Comment (Optional)</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add any notes or feedback..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Approve
                  </button>
                  <button
                    onClick={handleRequestChanges}
                    className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Request Changes
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Execution Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">Scheduled</p>
                    <p className="text-gray-600 text-xs">Task queued for execution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">Agent Running</p>
                    <p className="text-gray-600 text-xs">
                      {new Date(task.agentExecution.startTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    isAgentCompleted ? "bg-green-600" : "bg-red-600"
                  }`}></div>
                  <div className="text-sm">
                    <p className={`font-medium ${
                      isAgentCompleted ? "text-green-900" : "text-red-900"
                    }`}>
                      {isAgentCompleted ? "Completed" : "Failed"}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {task.agentExecution.completionTime
                        ? new Date(task.agentExecution.completionTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                        : "See error details"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/clients/${task.clientId}`)}
                  className="w-full text-left text-sm text-blue-600 hover:text-blue-700"
                >
                  → View client details
                </button>
                <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700">
                  → View agent audit log
                </button>
                <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700">
                  → Retry execution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
