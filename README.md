# Medicalease Frontend

The frontend application for Medicalease, a modern healthcare platform built with React, TypeScript, and Vite.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [Yarn](https://yarnpkg.com/) (v1.22.19 or higher)

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/Solverein/Medicalease-Frontend.git
cd Medicalease-Frontend
```

2. Install dependencies:

```bash
yarn install
```

## 💻 Development

To start the development server:

```bash
yarn dev
```

This will run the application in development mode. Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

### Other Development Commands

- **Linting**:

```bash
yarn lint
```

- **Auto-fix linting issues**:

```bash
yarn lint:fix
```

## 🏗️ Building for Production

To create a production build:

```bash
yarn build
```

The build artifacts will be stored in the `dist/` directory.

To preview the production build locally:

```bash
yarn preview
```

## 🧰 Tech Stack

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: Tanstack Router
- **UI Library**: Material UI (MUI)
- **Form Handling**: React Hook Form with Yup validation
- **API Client**: Tanstack React Query
- **Code Quality**: ESLint, Prettier, Husky

## 📁 Project Structure

```
src/
├── assets/        # Static assets like images, fonts, etc.
├── components/    # Reusable UI components
├── config/        # App configuration files
├── hooks/         # Custom React hooks
├── pages/         # Application pages/routes
├── services/      # API service functions
├── styles/        # Global styles and theme configuration
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
├── App.tsx        # Root App component
└── main.tsx       # Application entry point
```
