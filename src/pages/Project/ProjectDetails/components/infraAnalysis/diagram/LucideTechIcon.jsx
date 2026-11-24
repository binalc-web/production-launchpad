import { AlertCircle, Box, Database, Github, Globe, Server, User } from "lucide-react";

const ICON_MAP = {
  "mdi:alert-circle-outline": AlertCircle,
  "mdi:application-brackets-outline": Box,
  "mdi:account-outline": User,
  "mdi:database-outline": Database,
  "mdi:engine-outline": Server,
  "mdi:github": Github,
  "mdi:server-network-outline": Server,
  "mdi:transit-connection-variant": Globe,
  "mdi:web": Globe,
  "devicon:docker": Box,
  "devicon:express": Server,
  "devicon:nextjs": Globe,
  "devicon:nodejs": Server,
  "devicon:postgresql": Database,
  "devicon:react": Globe,
  "devicon:redis": Database,
  "devicon:terraform": Box,
  "logos:aws-cloudwatch": Server,
  "logos:aws-ecs": Server,
  "logos:aws-rds": Database,
  "logos:aws-lambda": Server,
  "logos:aws-s3": Box,
  "logos:aws-cognito": User,
  "logos:aws-dynamodb": Database,
  "logos:github-actions": Github,
};

/** Lucide fallback when Iconify key is unavailable. */
export function LucideTechIcon({ icon, className }) {
  const Icon = ICON_MAP[icon] ?? Box;
  return <Icon className={className} aria-hidden />;
}
