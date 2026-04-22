import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Building2, Settings, CheckCircle2, XCircle, Bot, Calendar, FileText } from "lucide-react";
import { clients, tasks, agentAuditLog } from "../data/mockData";
import { toast } from "sonner";

export function ClientDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const client = clients.find(c => c.id === clientId);

  const [agentType, setAgentType] = useState(client?.agentConfig?.agentType || "");
  const [oneDrivePath, setOneDrivePath] = useState(client?.agentConfig?.oneDrivePath || "");
  const [skillName, setSkillName] = useState(client?.agentConfig?.skillName || "");
  const [pathValidation, setPathValidation] = useState<"valid" | "invalid" | null>(
    client?.agentConfig?.isValid ? "valid" : null
  );

  if (!client) {
    return <div className="p-8">Client not found</div>;
  }

  const clientTasks = tasks.filter(t => t.clientId === clientId);
  const clientAuditLog = agentAuditLog.filter(a => a.client === client.name);

  const handleValidatePath = () => {
    if (oneDrivePath.includes("/Clients/") && oneDrivePath.length > 10) {
      setPathValidation("valid");
      toast.success("Path validated successfully");
    } else {
      setPathValidation("invalid");
      toast.error("Invalid OneDrive path");
    }
  };

  const handleSaveConfig = () => {
    if (pathValidation === "valid") {
      toast.success("Agent configuration saved", {
        description: "The agent will start running on the next scheduled task"
      });
    } else {
      toast.error("Please validate the OneDrive path first");
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
                <p className="text-gray-600 mt-1">{client.industry} • {client.status}</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">
              Last activity: {new Date(client.lastActivity).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Agent Configuration */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900">AI Agent Configuration</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Agent Type
                </label>
                <select
                  value={agentType}
                  onChange={(e) => setAgentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Select an agent type...</option>
                  <option value="Claude for Excel">Claude for Excel</option>
                  <option value="Claude Cowork">Claude Cowork</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the AI agent that will handle automated tasks for this client
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  OneDrive File Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={oneDrivePath}
                    onChange={(e) => {
                      setOneDrivePath(e.target.value);
                      setPathValidation(null);
                    }}
                    placeholder="/Clients/ClientName/Folder"
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                      pathValidation === "valid" ? "border-green-500" :
                      pathValidation === "invalid" ? "border-red-500" :
                      "border-gray-200"
                    }`}
                  />
                  <button
                    onClick={handleValidatePath}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Validate
                  </button>
                </div>
                {pathValidation === "valid" && (
                  <div className="flex items-center gap-2 mt-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs">Path validated successfully</span>
                  </div>
                )}
                {pathValidation === "invalid" && (
                  <div className="flex items-center gap-2 mt-2 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="text-xs">Invalid path. Please check the format.</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Specify the OneDrive folder where the agent will access files
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g., monthly-financial-report"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The specific workflow or skill the agent should execute
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveConfig}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>

          {/* Client Tasks */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Recent Tasks</h2>
            <div className="space-y-3">
              {clientTasks.length > 0 ? (
                clientTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="w-full text-left p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {task.assigneeType === "agent" && (
                          <Bot className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-900">{task.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.status === "Agent Completed" ? "bg-purple-100 text-purple-700" :
                        task.status === "Action Required" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {new Date(task.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span>{task.assignee}</span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No tasks found for this client</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Agent Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Agent Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {client.agentConfig?.agentType || "Not configured"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Configuration Status</p>
                <div className="flex items-center gap-2">
                  {client.agentConfig?.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700 font-medium">Needs Setup</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Tasks Completed</p>
                <p className="text-sm font-medium text-gray-900">
                  {clientAuditLog.filter(a => a.status === "Completed").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Agent Audit Log</h3>
            {clientAuditLog.length > 0 ? (
              <div className="space-y-3">
                {clientAuditLog.slice(0, 3).map(log => (
                  <div key={log.id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-900 font-medium">{log.task}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.status === "Completed" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(log.executionTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View full log →
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No agent activity yet</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View all documents
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule meeting
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Edit client details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
