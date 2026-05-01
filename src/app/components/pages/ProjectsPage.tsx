import { useState } from 'react';
import {
  Filter, Columns, Edit3, Plus, X, ChevronDown, ChevronUp, MoreHorizontal,
  MessageSquare, CheckCircle, Circle, Clock, ArrowUpDown, ChevronRight,
  Calendar, ExternalLink, Send, Bot
} from 'lucide-react';
import { projects as initialProjects, TEAM_MEMBERS, type Project, type Task, type Label } from '../../data/mockData';
import { AGENT_LABELS } from '../../data/aiAgentData';
import { Avatar } from '../Layout';
import { AgentAvatar, AgentStatusBadge } from '../ui/AgentAvatar';

const LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  pink: { bg: '#FDF2F8', text: '#DB2777' },
  yellow: { bg: '#FEFCE8', text: '#CA8A04' },
  blue: { bg: '#EFF6FF', text: '#2563EB' },
  green: { bg: '#F0FDF4', text: '#16A34A' },
  gray: { bg: '#F3F4F6', text: '#6B7280' },
  red: { bg: '#FEF2F2', text: '#DC2626' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'Not Started': { bg: '#F3F4F6', text: '#6B7280' },
  'In Progress': { bg: '#EFF6FF', text: '#2563EB' },
  'Complete': { bg: '#F0FDF4', text: '#16A34A' },
  'Waiting on Client': { bg: '#FEFCE8', text: '#CA8A04' },
};

function LabelBadge({ label }: { label: Label }) {
  const style = LABEL_STYLES[label.color];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text }}>
      {label.name}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { bg: '#F3F4F6', text: '#6B7280' };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: style.bg, color: style.text }}>
      {status}
    </span>
  );
}

const AVAILABLE_LABELS: Label[] = [
  { name: 'Missing Information', color: 'pink' },
  { name: 'Follow Up', color: 'yellow' },
  { name: 'Client Review', color: 'blue' },
  { name: 'Urgent', color: 'red' },
  { name: 'On Hold', color: 'gray' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState(() => {
    return initialProjects.map(p => {
      if (p.id === 'p2') {
        return { ...p, tasks: [...p.tasks, ...AGENT_DEMO_TASKS] };
      }
      return p;
    });
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState(['Status: In Progress', 'Due: This Month', 'Assignee: Beatty']);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [taskCommentText, setTaskCommentText] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const removeFilter = (f: string) => setFilters(filters.filter(x => x !== f));

  const toggleTaskComplete = (projectId: string, taskId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed, status: t.completed ? 'Not Started' : 'Complete' } : t)
      };
    }));
    if (selectedTask?.id === taskId) {
      setSelectedTask(t => t ? { ...t, completed: !t.completed, status: t.completed ? 'Not Started' as const : 'Complete' as const } : null);
    }
  };

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ArrowUpDown size={11} className="text-[#D1D5DB] ml-1" />;
    return sortDir === 'asc' ? <ChevronUp size={11} className="text-[#6B7280] ml-1" /> : <ChevronDown size={11} className="text-[#6B7280] ml-1" />;
  };

  const handleAddLabel = (label: Label) => {
    if (!selectedProject) return;
    const hasLabel = selectedProject.labels.some(l => l.name === label.name);
    const newLabels = hasLabel
      ? selectedProject.labels.filter(l => l.name !== label.name)
      : [...selectedProject.labels, label];
    const updated = { ...selectedProject, labels: newLabels };
    setSelectedProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const postComment = () => {
    if (!newComment.trim() || !selectedProject) return;
    const comment = {
      id: `c${Date.now()}`,
      author: 'Sarah K.',
      initials: 'SK',
      color: '#3B82F6',
      message: newComment,
      timestamp: 'Just now',
    };
    const updated = { ...selectedProject, comments: [...selectedProject.comments, comment] };
    setSelectedProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    setNewComment('');
  };

  const activeTasks = selectedProject?.tasks.filter(t => !t.completed) ?? [];
  const completedTasks = selectedProject?.tasks.filter(t => t.completed) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="h-[52px] border-b border-[#E5E7EB] flex items-center px-6 gap-3 flex-shrink-0 bg-white">
        <h1 className="text-[20px] font-semibold text-[#111827]">Projects</h1>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <Filter size={13} /> Filters
            {filters.length > 0 && <span className="bg-[#2563EB] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{filters.length}</span>}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <Columns size={13} /> Add Columns
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E7EB] rounded text-[13px] text-[#374151] hover:bg-[#F9FAFB] transition-colors">
            <Edit3 size={13} /> Bulk Edit
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded transition-colors">
            <Plus size={13} /> Create Project
          </button>
        </div>
      </div>

      {/* Filter pills */}
      {filters.length > 0 && (
        <div className="h-[38px] border-b border-[#E5E7EB] flex items-center px-6 gap-2 flex-shrink-0 bg-[#FAFAFA]">
          <span className="text-[11px] text-[#9CA3AF] font-medium mr-1">Filters:</span>
          {filters.map(f => (
            <span key={f} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
              {f}
              <button onClick={() => removeFilter(f)} className="hover:text-[#1D4ED8] ml-0.5">
                <X size={10} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          <button onClick={() => setFilters([])} className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280] ml-1">
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Table */}
        <div className={`flex-1 overflow-auto min-w-0 ${selectedProject ? 'border-r border-[#E5E7EB]' : ''}`}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr>
                <th className="w-8 px-4 py-2.5 text-left">
                  <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                </th>
                {[
                  { key: 'name', label: 'Project Name' },
                  { key: 'client', label: 'Client' },
                  { key: 'labels', label: 'Labels' },
                  { key: 'dueDate', label: 'Due Date' },
                  { key: 'status', label: 'Status' },
                  { key: 'nextAssignee', label: 'Next Assignee' },
                  { key: 'lastEdited', label: 'Last Edited' },
                ].map(({ key, label }) => (
                  <th key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-2.5 text-left text-[11px] font-medium text-[#6B7280] uppercase tracking-wider cursor-pointer hover:bg-[#F3F4F6] select-none">
                    <span className="flex items-center">
                      {label} <SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  onClick={() => { setSelectedProject(project); setSelectedTask(null); }}
                  className={`border-b border-[#F3F4F6] cursor-pointer transition-colors ${
                    selectedProject?.id === project.id ? 'bg-[#EFF6FF]' : 'hover:bg-[#F9FAFB]'
                  }`}
                >
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-[#D1D5DB] accent-[#2563EB]" />
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[13px] text-[#111827] font-medium hover:text-[#2563EB]">
                      {project.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-[#6B7280]">{project.client}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {project.labels.map(l => <LabelBadge key={l.name} label={l} />)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-[#374151] whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#9CA3AF]" />
                      {project.dueDate}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={project.status} /></td>
                  <td className="px-4 py-2.5">
                    {TEAM_MEMBERS[project.nextAssignee] && (
                      <div className="flex items-center gap-1.5">
                        <Avatar
                          initials={TEAM_MEMBERS[project.nextAssignee].initials}
                          color={TEAM_MEMBERS[project.nextAssignee].color}
                          size="sm"
                        />
                        <span className="text-[13px] text-[#374151]">{project.nextAssignee}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-[#9CA3AF]">{project.lastEdited}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 text-[12px] text-[#9CA3AF]">{projects.length} projects</div>
        </div>

        {/* Project detail panel */}
        {selectedProject && !selectedTask && (
          <div className="w-[560px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedProject(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                  <X size={14} className="text-[#9CA3AF]" />
                </button>
                <span className="text-[13px] text-[#9CA3AF]">Projects</span>
                <ChevronRight size={12} className="text-[#D1D5DB]" />
                <span className="text-[13px] text-[#374151] font-medium truncate max-w-[200px]">{selectedProject.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="px-2.5 py-1 text-[12px] border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] text-[#374151]">Edit</button>
                <button className="p-1.5 hover:bg-[#F3F4F6] rounded">
                  <MoreHorizontal size={14} className="text-[#6B7280]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Project info card */}
              <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <h2 className="text-[18px] font-semibold text-[#111827] mb-1">{selectedProject.name}</h2>
                <p className="text-[13px] text-[#6B7280] mb-4">{selectedProject.client}</p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
                  <div>
                    <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider block mb-1">Status</span>
                    <StatusBadge status={selectedProject.status} />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider block mb-1">Due Date</span>
                    <span className="text-[#374151] flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#9CA3AF]" />
                      {selectedProject.dueDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider block mb-1">Assignee</span>
                    <div className="flex items-center gap-1.5">
                      {TEAM_MEMBERS[selectedProject.assignee] && (
                        <>
                          <Avatar initials={TEAM_MEMBERS[selectedProject.assignee].initials} color={TEAM_MEMBERS[selectedProject.assignee].color} size="sm" />
                          <span className="text-[#374151]">{selectedProject.assignee}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider block mb-1">Team</span>
                    <div className="flex items-center gap-1">
                      {selectedProject.teamMembers.map(m => TEAM_MEMBERS[m] && (
                        <Avatar key={m} initials={TEAM_MEMBERS[m].initials} color={TEAM_MEMBERS[m].color} size="sm" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Labels */}
                <div className="mt-4">
                  <span className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider block mb-2">Labels</span>
                  <div className="flex flex-wrap items-center gap-1.5 relative">
                    {selectedProject.labels.map(l => (
                      <LabelBadge key={l.name} label={l} />
                    ))}
                    <button
                      onClick={() => setShowLabelPicker(!showLabelPicker)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-[#D1D5DB] rounded-full text-[11px] text-[#9CA3AF] hover:border-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    >
                      <Plus size={10} /> Add Label
                    </button>
                    {showLabelPicker && (
                      <div className="absolute top-7 left-0 bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-2 z-20 w-[200px]">
                        {AVAILABLE_LABELS.map(l => {
                          const style = LABEL_STYLES[l.color];
                          const has = selectedProject.labels.some(x => x.name === l.name);
                          return (
                            <button
                              key={l.name}
                              onClick={() => { handleAddLabel(l); setShowLabelPicker(false); }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F9FAFB] text-left ${has ? 'opacity-50' : ''}`}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: style.text }} />
                              <span className="text-[12px] text-[#374151]">{l.name}</span>
                              {has && <span className="ml-auto text-[10px] text-[#9CA3AF]">added</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Associated Series */}
              {selectedProject.seriesDescription && (
                <div className="px-5 py-3 border-b border-[#F3F4F6] bg-[#FAFAFA]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider mb-0.5">Associated Series</p>
                      <p className="text-[13px] text-[#374151]">{selectedProject.seriesDescription}</p>
                    </div>
                    <button className="text-[12px] text-[#2563EB] hover:underline flex items-center gap-1">
                      <ExternalLink size={11} /> View series
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks */}
              <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-[#111827]">
                    Tasks <span className="font-normal text-[#9CA3AF]">({selectedProject.tasks.length})</span>
                  </h3>
                  <button className="text-[12px] text-[#2563EB] flex items-center gap-1 hover:underline">
                    <Plus size={11} /> Add Task
                  </button>
                </div>

                <div className="space-y-0.5">
                  {activeTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      projectId={selectedProject.id}
                      onToggle={toggleTaskComplete}
                      onSelect={setSelectedTask}
                    />
                  ))}
                  {completedTasks.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-[#F3F4F6]" />
                        <span className="text-[11px] text-[#9CA3AF]">{completedTasks.length} completed</span>
                        <div className="flex-1 h-px bg-[#F3F4F6]" />
                      </div>
                      {completedTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          projectId={selectedProject.id}
                          onToggle={toggleTaskComplete}
                          onSelect={setSelectedTask}
                        />
                      ))}
                    </>
                  )}
                  {selectedProject.tasks.length === 0 && (
                    <div className="text-center py-6 text-[13px] text-[#9CA3AF]">No tasks yet</div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="px-5 py-4">
                <h3 className="text-[13px] font-semibold text-[#111827] mb-3 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-[#6B7280]" />
                  Comments <span className="font-normal text-[#9CA3AF]">({selectedProject.comments.length})</span>
                </h3>
                <div className="space-y-3 mb-4">
                  {selectedProject.comments.map(comment => (
                    <div key={comment.id} className="flex gap-2.5">
                      <Avatar initials={comment.initials} color={comment.color} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold text-[#111827]">{comment.author}</span>
                          <span className="text-[11px] text-[#9CA3AF]">{comment.timestamp}</span>
                        </div>
                        <p className="text-[13px] text-[#374151] leading-relaxed">{comment.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Avatar initials="SK" color="#3B82F6" size="sm" />
                  <div className="flex-1 border border-[#E5E7EB] rounded-lg overflow-hidden focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB]">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && postComment()}
                      placeholder="Add a comment... (type @ to mention)"
                      className="w-full px-3 py-2 text-[13px] text-[#374151] outline-none bg-white placeholder-[#9CA3AF]"
                    />
                    <div className="flex justify-end px-2 py-1.5 bg-[#F9FAFB] border-t border-[#F3F4F6]">
                      <button
                        onClick={postComment}
                        className="flex items-center gap-1 px-3 py-1 bg-[#2563EB] text-white text-[12px] font-medium rounded hover:bg-[#1D4ED8] transition-colors"
                      >
                        <Send size={11} /> Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task detail panel */}
        {selectedTask && selectedProject && (
          <div className="w-[560px] flex-shrink-0 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB] flex-shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                  <ChevronRight size={14} className="text-[#9CA3AF] rotate-180" />
                </button>
                <span className="text-[13px] text-[#9CA3AF] cursor-pointer hover:text-[#2563EB]" onClick={() => setSelectedTask(null)}>{selectedProject.name}</span>
                <ChevronRight size={12} className="text-[#D1D5DB]" />
                <span className="text-[13px] text-[#374151] font-medium truncate max-w-[180px]">{selectedTask.name}</span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-[#F3F4F6] rounded">
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-[16px] font-semibold text-[#111827] flex-1 pr-4">{selectedTask.name}</h2>
                <select className="text-[12px] border border-[#E5E7EB] rounded px-2 py-1 text-[#374151] bg-white outline-none focus:border-[#2563EB]">
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Complete</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4 text-[13px]">
                <div>
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider block mb-1">Due Date</span>
                  <span className="text-[#374151] flex items-center gap-1"><Calendar size={11} className="text-[#9CA3AF]" /> {selectedTask.dueDate}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider block mb-1">Budgeted Time</span>
                  <span className="text-[#374151] flex items-center gap-1"><Clock size={11} className="text-[#9CA3AF]" /> {selectedTask.budgetedTime}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider block mb-1">Assignee</span>
                  <div className="flex items-center gap-1.5">
                    {TEAM_MEMBERS[selectedTask.assignee] && (
                      <><Avatar initials={TEAM_MEMBERS[selectedTask.assignee].initials} color={TEAM_MEMBERS[selectedTask.assignee].color} size="sm" />
                        <span className="text-[#374151]">{selectedTask.assignee}</span></>
                    )}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              {selectedTask.checklistItems && selectedTask.checklistItems.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[12px] font-semibold text-[#374151] mb-2 flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-[#6B7280]" />
                    Checklist ({selectedTask.checklistCompleted}/{selectedTask.checklistTotal})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedTask.checklistItems.map(item => (
                      <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => {}}
                          className="rounded border-[#D1D5DB] accent-[#2563EB]"
                        />
                        <span className={`text-[13px] ${item.checked ? 'line-through text-[#9CA3AF]' : 'text-[#374151]'}`}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all"
                      style={{ width: `${(selectedTask.checklistCompleted / selectedTask.checklistTotal) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Task comments */}
              <div>
                <h4 className="text-[12px] font-semibold text-[#374151] mb-3 flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-[#6B7280]" /> Comments
                </h4>
                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                  <div className="space-y-3 mb-3">
                    {selectedTask.comments.map(c => (
                      <div key={c.id} className="flex gap-2.5">
                        <Avatar initials={c.initials} color={c.color} size="sm" />
                        <div>
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold text-[#111827]">{c.author}</span>
                            <span className="text-[11px] text-[#9CA3AF]">{c.timestamp}</span>
                          </div>
                          <p className="text-[13px] text-[#374151]">{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[#9CA3AF] mb-3">No comments yet.</p>
                )}
                <div className="flex gap-2">
                  <Avatar initials="SK" color="#3B82F6" size="sm" />
                  <div className="flex-1 border border-[#E5E7EB] rounded focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB] overflow-hidden">
                    <input
                      value={taskCommentText}
                      onChange={e => setTaskCommentText(e.target.value)}
                      placeholder="Comment on this task..."
                      className="w-full px-3 py-2 text-[13px] outline-none bg-white placeholder-[#9CA3AF]"
                    />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#F3F4F6]">
                  <button onClick={() => setSelectedTask(null)} className="text-[12px] text-[#2563EB] hover:underline flex items-center gap-1">
                    <ExternalLink size={11} /> Go to project
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, projectId, onToggle, onSelect }: {
  task: Task;
  projectId: string;
  onToggle: (pid: string, tid: string) => void;
  onSelect: (t: Task) => void;
}) {
  const [showAgentNotes, setShowAgentNotes] = useState(false);
  const isAgentTask = !!task.agentTask;
  const agentState = task.agentTask?.state;
  const agentType = task.agentTask?.type;

  const borderStyle = agentState === 'running'
    ? 'border-l-2 border-[#4F46E5]'
    : agentState === 'failed'
    ? 'border-l-2 border-[#DC2626]'
    : '';

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-2 rounded hover:bg-[#F9FAFB] group cursor-pointer ${task.completed ? 'opacity-50' : ''} ${borderStyle} ${agentState === 'running' ? 'bg-[#FAFBFF]' : agentState === 'failed' ? 'bg-[#FFF5F5]' : ''}`}
        onClick={() => onSelect(task)}
      >
        <button
          onClick={e => { e.stopPropagation(); if (!isAgentTask) onToggle(projectId, task.id); }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center"
        >
          {isAgentTask && agentState === 'completed' ? (
            <CheckCircle size={16} style={{ color: '#4F46E5' }} />
          ) : task.completed ? (
            <CheckCircle size={16} className="text-[#16A34A]" />
          ) : (
            <Circle size={16} className="text-[#D1D5DB] hover:text-[#2563EB] transition-colors" />
          )}
        </button>

        {isAgentTask && agentType && (
          <AgentAvatar agentType={agentType} size="xs" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isAgentTask && <Bot size={11} className="text-[#4F46E5] flex-shrink-0" />}
            <span className={`text-[13px] font-medium truncate ${task.completed ? 'line-through text-[#9CA3AF]' : 'text-[#111827]'}`}>
              {task.name}
            </span>
          </div>
          {agentState === 'completed' && task.agentTask?.completedAt && (
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Completed {task.agentTask.completedAt} · {agentType ? AGENT_LABELS[agentType].label : ''} · {task.agentTask.skillName}
            </p>
          )}
          {agentState === 'running' && (
            <p className="text-[11px] text-[#4F46E5] mt-0.5">
              Started 2 min ago
            </p>
          )}
          {agentState === 'scheduled' && task.agentTask?.scheduledDate && (
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Runs on {task.agentTask.scheduledDate} · {agentType ? AGENT_LABELS[agentType].label : ''}
            </p>
          )}
        </div>

        {isAgentTask && agentState && (
          <AgentStatusBadge status={agentState} size="xs" />
        )}

        {!isAgentTask && task.isNext && !task.completed && (
          <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-semibold rounded-full flex-shrink-0">NEXT</span>
        )}

        {!isAgentTask && (
          <>
            <span className="text-[11px] text-[#9CA3AF] flex-shrink-0 flex items-center gap-0.5">
              <Clock size={10} /> {task.budgetedTime}
            </span>
            <span className="text-[11px] text-[#9CA3AF] flex-shrink-0">
              {task.checklistCompleted}/{task.checklistTotal}
            </span>
          </>
        )}

        <span className="text-[12px] text-[#9CA3AF] flex-shrink-0 flex items-center gap-1">
          <Calendar size={11} /> {task.dueDate}
        </span>

        {isAgentTask && agentType ? (
          <AgentAvatar agentType={agentType} size="xs" />
        ) : TEAM_MEMBERS[task.assignee] ? (
          <Avatar initials={TEAM_MEMBERS[task.assignee].initials} color={TEAM_MEMBERS[task.assignee].color} size="sm" />
        ) : null}

        {isAgentTask && agentState === 'completed' && (
          <button
            onClick={e => { e.stopPropagation(); setShowAgentNotes(!showAgentNotes); }}
            className="text-[11px] text-[#4F46E5] hover:underline flex-shrink-0"
          >
            {showAgentNotes ? 'Hide Notes' : 'View Notes'}
          </button>
        )}
        {isAgentTask && task.agentTask?.outputFile && (
          <button
            onClick={e => e.stopPropagation()}
            className="text-[11px] text-[#4F46E5] hover:underline flex-shrink-0"
          >
            View Output →
          </button>
        )}
      </div>

      {/* Agent completion notes (expanded) */}
      {showAgentNotes && task.agentTask?.notes && (
        <div className="mx-7 mb-2 p-3 bg-[#EEF2FF] border border-[#E0E7FF] rounded-lg">
          <p className="text-[11px] font-semibold text-[#4F46E5] mb-1 flex items-center gap-1.5">
            <Bot size={11} /> Agent Notes — {agentType ? AGENT_LABELS[agentType].label : ''}
          </p>
          <p className="text-[12px] text-[#374151] leading-relaxed">{task.agentTask.notes}</p>
          {task.agentTask.outputFile && (
            <button className="flex items-center gap-1 text-[11px] text-[#4F46E5] hover:underline mt-2">
              <ExternalLink size={10} /> Bookkeeping.xlsx — March 2026 tab
            </button>
          )}
        </div>
      )}

      {/* Failed agent comment */}
      {isAgentTask && agentState === 'failed' && (
        <div className="mx-7 mb-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
          <div className="flex items-center gap-2 mb-1.5">
            {agentType && <AgentAvatar agentType={agentType} size="xs" />}
            <span className="text-[11px] font-semibold text-[#DC2626]">{agentType ? AGENT_LABELS[agentType].label : ''}</span>
          </div>
          <p className="text-[12px] text-[#374151] leading-relaxed">
            {task.agentTask?.failureReason || `@Jordan — I wasn't able to complete the ${task.agentTask?.skillName}. The file couldn't be located. Can you check the file path or upload the correct file? Due date: ${task.dueDate}.`}
          </p>
          <button className="mt-2 text-[11px] px-2.5 py-1 bg-white border border-[#FECACA] rounded text-[#DC2626] hover:bg-[#FEF2F2]">
            Fix Configuration →
          </button>
        </div>
      )}
    </div>
  );
}

// Inject agent tasks into the Monthly Bookkeeping project (p2) for demo
const AGENT_DEMO_TASKS: Task[] = [
  {
    id: 'agent-bt1',
    name: 'Transaction Analysis',
    dueDate: 'Apr 1',
    status: 'Complete',
    budgetedTime: '—',
    checklistTotal: 0,
    checklistCompleted: 0,
    assignee: '',
    completed: true,
    agentTask: {
      type: 'claude-excel',
      skillName: 'Transaction Analysis',
      state: 'completed',
      completedAt: 'Apr 1 at 9:42 AM',
      notes: 'Analyzed 847 transactions across 3 accounts. Categorized into 12 expense types. Flagged 4 items for manual review. Output written to tab \'March 2026 — Transaction Analysis\'.',
      outputFile: '/Clients/Baker Dental/2026/Bookkeeping.xlsx',
    },
  },
  {
    id: 'agent-bt2',
    name: 'Bank Reconciliation',
    dueDate: 'Apr 2',
    status: 'In Progress',
    budgetedTime: '—',
    checklistTotal: 0,
    checklistCompleted: 0,
    assignee: '',
    agentTask: {
      type: 'claude-excel',
      skillName: 'Bank Reconciliation',
      state: 'running',
      completedAt: undefined,
      notes: 'Started 2 min ago',
    },
  },
  {
    id: 'agent-bt3',
    name: 'Payroll Summary',
    dueDate: 'Apr 5',
    status: 'Not Started',
    budgetedTime: '—',
    checklistTotal: 0,
    checklistCompleted: 0,
    assignee: '',
    agentTask: {
      type: 'claude-cowork',
      skillName: 'Payroll Summary',
      state: 'scheduled',
      scheduledDate: 'Apr 5',
    },
  },
];