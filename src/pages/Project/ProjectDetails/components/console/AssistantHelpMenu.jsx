import { CircleHelp, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { buildAssistantHelpChatHref } from "../../lib/consoleQuickNavCatalog";

export const ASSISTANT_HELP_STARTER_PROMPTS = [
  "How does locking a release work?",
  "Implement then preview — what's the default path?",
  "What's the difference between Project reports and QA reports?",
  "Where is infra analysis in the console?",
];

/**
 * Help menu: open LaunchPad assistant (/chat, all projects) and platform workflow starters.
 * @param {{ className?: string }} props
 */
export function AssistantHelpMenu({ className }) {
  const navigate = useNavigate();

  const openAssistant = () => {
    navigate("/chat");
  };

  const openWithQuestion = (question) => {
    navigate(buildAssistantHelpChatHref(question));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Help — LaunchPad assistant and platform questions"
          aria-label="Help"
          data-tour="workspace-help-button"
          className={cn(
            "h-8 shrink-0 gap-1.5 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            className,
          )}
        >
          <CircleHelp className="size-4 shrink-0" aria-hidden />
          <span className="hidden text-xs font-medium sm:inline">Help</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          LaunchPad assistant
        </DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer gap-2" onSelect={openAssistant}>
          <MessageSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>Open assistant</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Ask about the platform
        </DropdownMenuLabel>
        {ASSISTANT_HELP_STARTER_PROMPTS.map((prompt) => (
          <DropdownMenuItem
            key={prompt}
            className="cursor-pointer text-xs leading-snug"
            onSelect={() => openWithQuestion(prompt)}
          >
            {prompt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
