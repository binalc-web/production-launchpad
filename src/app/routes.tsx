import { createBrowserRouter, Navigate } from 'react-router';
import Layout from './components/Layout';
import ProjectsPage from './components/pages/ProjectsPage';
import ClientsPage from './components/pages/ClientsPage';
import TemplatesPage from './components/pages/TemplatesPage';
import TasksPage from './components/pages/TasksPage';
import PlanningPage from './components/pages/PlanningPage';
import NotificationsPage from './components/pages/NotificationsPage';
import HelpPage from './components/pages/HelpPage';
import AINotetakerHub from './components/pages/AINotetakerHub';
import AINotetakerSettings from './components/pages/AINotetakerSettings';
import SuggestionReviewPage from './components/pages/SuggestionReviewPage';
import MeetingDetailPage from './components/pages/MeetingDetailPage';
import AIAgentsHub from './components/pages/AIAgentsHub';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', Component: ProjectsPage },
      { path: 'clients', Component: ClientsPage },
      { path: 'templates', Component: TemplatesPage },
      { path: 'tasks', Component: TasksPage },
      { path: 'planning', Component: PlanningPage },
      { path: 'notifications', Component: NotificationsPage },
      { path: 'help', Component: HelpPage },
      {
        path: 'ai-notetaker',
        children: [
          { index: true, Component: AINotetakerHub },
          { path: 'settings', Component: AINotetakerSettings },
          { path: 'review/:id', Component: SuggestionReviewPage },
          { path: 'meeting/:id', Component: MeetingDetailPage },
        ],
      },
      {
        path: 'ai-agents',
        children: [
          { index: true, Component: AIAgentsHub },
        ],
      },
    ],
  },
]);