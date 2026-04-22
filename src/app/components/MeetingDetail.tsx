import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Check, X, Edit, TrendingUp, TrendingDown, MessageSquare, Search } from "lucide-react";
import { meetings } from "../data/mockData";
import { toast } from "sonner";

export function MeetingDetail() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const meeting = meetings.find(m => m.id === meetingId);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<string[]>([]);
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");

  if (!meeting) {
    return <div className="p-8">Meeting not found</div>;
  }

  const handleAccept = (suggestionId: string) => {
    setAcceptedSuggestions([...acceptedSuggestions, suggestionId]);
    toast.success("Task created successfully", {
      description: "The item has been added to your workflow"
    });
  };

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions([...dismissedSuggestions, suggestionId]);
    toast.info("Suggestion dismissed");
  };

  const activeSuggestions = meeting.suggestions.filter(
    s => !dismissedSuggestions.includes(s.id) && !acceptedSuggestions.includes(s.id)
  );

  const highlightSearchText = (text: string) => {
    if (!transcriptSearch) return text;
    const regex = new RegExp(`(${transcriptSearch})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/ai-hub')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Hub
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{meeting.clientName}</h1>
            <p className="text-gray-600 mt-1">
              {new Date(meeting.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
            {meeting.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* AI Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">AI Meeting Summary</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Key Discussion Points</h3>
                <ul className="space-y-2">
                  {meeting.summary.keyPoints.map((point, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-blue-600">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Decisions Made</h3>
                <ul className="space-y-2">
                  {meeting.summary.decisions.map((decision, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5" />
                      {decision}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Action Items</h3>
                <ul className="space-y-2">
                  {meeting.summary.actionItems.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-orange-600">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                AI Suggestions ({activeSuggestions.length})
              </h2>
              <span className="text-sm text-gray-500">Ranked by confidence</span>
            </div>

            <div className="space-y-4">
              {activeSuggestions.map((suggestion) => {
                const isEditing = editingSuggestion === suggestion.id;

                return (
                  <div
                    key={suggestion.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                            {suggestion.type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 ${
                            suggestion.confidence === 'High'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}>
                            {suggestion.confidence === 'High' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {suggestion.confidence} Confidence
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900">{suggestion.description}</h3>
                        <p className="text-sm text-gray-600 mt-1">Target: {suggestion.targetEntity}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">From transcript:</p>
                      <p className="text-sm text-gray-700 italic">"{suggestion.context}"</p>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mb-3">
                        {Object.entries(suggestion.details).map(([key, value]) => (
                          <div key={key}>
                            <label className="text-xs text-gray-600 block mb-1 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <input
                              type="text"
                              defaultValue={value as string}
                              className="w-full px-3 py-2 border border-gray-200 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(suggestion.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => setEditingSuggestion(isEditing ? null : suggestion.id)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDismiss(suggestion.id)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <X className="w-4 h-4" />
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {acceptedSuggestions.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✓ {acceptedSuggestions.length} suggestion(s) accepted and added to workflow
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Full Transcript</h3>
              </div>
              <span className="text-sm text-blue-600">
                {showTranscript ? 'Hide' : 'View'}
              </span>
            </button>

            {showTranscript && (
              <div className="mt-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transcript..."
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded text-sm"
                  />
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {meeting.transcript.map((entry, i) => (
                    <div key={i} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{entry.speaker}</span>
                        <span className="text-xs text-gray-500">{entry.time}</span>
                      </div>
                      <p className="text-gray-700 pl-4">{highlightSearchText(entry.text)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/clients/${meeting.clientId}`)}
                className="w-full text-left text-sm text-blue-600 hover:text-blue-700"
              >
                → View client profile
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700">
                → Schedule follow-up
              </button>
              <button className="w-full text-left text-sm text-blue-600 hover:text-blue-700">
                → Export summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
