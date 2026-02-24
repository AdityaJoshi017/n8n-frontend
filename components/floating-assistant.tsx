"use client";

import { useState } from "react";
import { Workflow, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const WORKFLOW_URL =
  "https://jonalo9576.app.n8n.cloud/workflow/EZavc7Q9GvQ24aRm";

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open workflow viewer"
      >
        <Workflow className="h-6 w-6" />
      </button>
    );
  }

  const containerClass = fullscreen
    ? "fixed inset-0 z-50"
    : "fixed bottom-6 right-6 z-50 h-[600px] w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] rounded-xl shadow-2xl";

  return (
    <div
      className={`${containerClass} flex flex-col border border-border bg-card overflow-hidden ${fullscreen ? "" : "rounded-xl"
        }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-secondary px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Workflow className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Workflow Assistant
            </p>
            <p className="text-[10px] text-muted-foreground">
              n8n Workflow View
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            <span className="sr-only">
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(false);
              setFullscreen(false);
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close workflow viewer</span>
          </Button>
        </div>
      </div>

      {/* Iframe Content */}
      <div className="flex-1 relative bg-background">
        {iframeError ? (
          <div className="flex flex-col items-center justify-center gap-4 p-6 h-full text-center">
            <Workflow className="h-10 w-10 text-muted-foreground opacity-40" />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">
                Unable to embed workflow
              </p>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                The n8n workflow page may block iframe embedding due to security
                headers. You can open it directly instead.
              </p>
            </div>
            <a
              href={WORKFLOW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Workflow className="h-4 w-4" />
              Open in n8n
            </a>
          </div>
        ) : (
          <iframe
            src={WORKFLOW_URL}
            title="n8n Workflow"
            className="h-full w-full border-none"
            onError={() => setIframeError(true)}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  );
}
