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

/**
 * LaunchPad Client Link serves this SPA under /embedded/<port>/ (or
 * /iframe-preview/<port>/). Without a matching basename, React Router treats
 * the full path as a route and throws 404 on the embed entry URL.
 * Derive basename at runtime — never hardcode /embedded/<port>.
 */
function getRouterBasename(): string {
  if (typeof window === 'undefined') return '/';
  try {
    const pathname = window.location.pathname;
    const embed = pathname.match(/^\/(embedded|iframe-preview)\/(\d{1,5})(?:\/|$)/);
    if (embed) return `/${embed[1]}/${embed[2]}`;
    const apps = pathname.match(/^\/apps\/[^/]+/);
    if (apps) return apps[0];
  } catch {
    /* ignore */
  }
  const viteBase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return viteBase || '/';
}

export const router = createBrowserRouter(
  [
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
  ],
  { basename: getRouterBasename() },
);