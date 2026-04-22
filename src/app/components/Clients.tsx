import { useNavigate } from "react-router";
import { Building2, Bot, CheckCircle2, XCircle } from "lucide-react";
import { clients } from "../data/mockData";

export function Clients() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
        <p className="text-gray-600 mt-1">Manage your client accounts and AI agent configurations</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {clients.map(client => (
          <button
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              {client.agentConfig && (
                <div className="flex items-center gap-1">
                  {client.agentConfig.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
              )}
            </div>

            <h3 className="font-semibold text-gray-900 mb-1">{client.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{client.industry}</p>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                {client.agentConfig?.agentType || "No agent configured"}
              </span>
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                {client.status}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
