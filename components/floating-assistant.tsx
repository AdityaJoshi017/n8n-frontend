"use client";

import { Workflow, ExternalLink } from "lucide-react";

const WORKFLOW_URL =
  "https://jonalo9576.app.n8n.cloud/workflow/EZavc7Q9GvQ24aRm";

export function FloatingAssistant() {
  const launchWorkflow = () => {
    window.open(
      WORKFLOW_URL,
      "WorkflowAssistant",
      "width=1200,height=800,resizable=yes,scrollbars=yes"
    );
  };

  return (
    <button
      onClick={launchWorkflow}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      aria-label="Open workflow builder"
    >
      <Workflow className="h-5 w-5" />
      <span className="text-sm font-medium">Open Builder</span>
      <ExternalLink className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}
