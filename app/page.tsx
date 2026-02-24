"use client";

import { useState, useCallback } from "react";
import { Workflow, Zap } from "lucide-react";
import { CommandPanel } from "@/components/command-panel";
import { TemplateViewer } from "@/components/template-viewer";
import { FloatingAssistant } from "@/components/floating-assistant";
import { ResponseLog } from "@/components/response-log";

interface LogEntry {
  timestamp: Date;
  payload: unknown;
  response: unknown;
}

export default function Home() {
  const [responseData, setResponseData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const handleResponse = useCallback((data: unknown) => {
    setResponseData(data);
    setLogEntries((prev) => [
      {
        timestamp: new Date(),
        payload: "see request",
        response: data,
      },
      ...prev,
    ]);
  }, []);

  const handleLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const handleError = useCallback((err: string | null) => {
    setError(err);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Workflow className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                n8n Workflow Tester
              </h1>
              <p className="text-xs text-muted-foreground">
                Frontend testing interface
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium text-foreground">
                Connected
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Command Panel */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <CommandPanel
                onResponse={handleResponse}
                onLoading={handleLoading}
                onError={handleError}
              />
            </div>

            {/* Request History */}
            <div className="rounded-xl border border-border bg-card p-5">
              <ResponseLog entries={logEntries} />
              {logEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
                  <p className="text-xs">Request history will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Template Viewer */}
          <div className="rounded-xl border border-border bg-card p-5">
            <TemplateViewer
              data={responseData}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      </main>

      {/* Floating Assistant */}
      <FloatingAssistant />
    </div>
  );
}
