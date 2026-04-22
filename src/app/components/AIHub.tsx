import { useNavigate } from "react-router";
import { Calendar, MessageSquare, Sparkles } from "lucide-react";
import { meetings, morningDigest } from "../data/mockData";

export function AIHub() {
  const navigate = useNavigate();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">AI Hub</h1>
        <p className="text-gray-600 mt-1">AI-powered meeting insights and agent activity</p>
      </div>

      {/* Morning Digest */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h2 className="font-semibold text-gray-900">Morning Digest</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">Tasks completed overnight and ready for your review:</p>

        <div className="space-y-3">
          {morningDigest.map(item => (
            <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.task}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.client}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {item.agentType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.completedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Review →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Recent Meetings</h2>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all
          </button>
        </div>

        <div className="space-y-4">
          {meetings.map(meeting => (
            <button
              key={meeting.id}
              onClick={() => navigate(`/ai-hub/meeting/${meeting.id}`)}
              className="w-full text-left p-5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{meeting.clientName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(meeting.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {meeting.status}
                </span>
              </div>

              <div className="pl-13">
                <p className="text-sm text-gray-600 mb-2">AI identified {meeting.suggestions.length} actionable items</p>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                    {meeting.summary.keyPoints.length} key points
                  </span>
                  <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded">
                    {meeting.summary.decisions.length} decisions
                  </span>
                  <span className="text-xs px-2 py-1 bg-orange-50 text-orange-600 rounded">
                    {meeting.summary.actionItems.length} action items
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
