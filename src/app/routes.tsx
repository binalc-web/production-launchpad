import React from "react";
import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { Dashboard } from "./components/Dashboard";
import { Clients } from "./components/Clients";
import { Projects } from "./components/Projects";
import { Tasks } from "./components/Tasks";
import { Workflows } from "./components/Workflows";
import { AIHub } from "./components/AIHub";
import { MeetingDetail } from "./components/MeetingDetail";
import { TaskDetail } from "./components/TaskDetail";
import { ClientDetail } from "./components/ClientDetail";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "clients", element: <Clients /> },
      { path: "clients/:clientId", element: <ClientDetail /> },
      { path: "projects", element: <Projects /> },
      { path: "tasks", element: <Tasks /> },
      { path: "tasks/:taskId", element: <TaskDetail /> },
      { path: "workflows", element: <Workflows /> },
      { path: "ai-hub", element: <AIHub /> },
      { path: "ai-hub/meeting/:meetingId", element: <MeetingDetail /> },
    ],
  },
]);
