"use client";

import { useState, useCallback, useEffect } from "react";
import { Workflow, Zap } from "lucide-react";
import { CommandPanel } from "@/components/command-panel";
import { TemplateViewer } from "@/components/template-viewer";
import { FloatingAssistant } from "@/components/floating-assistant";
import { ResponseLog } from "@/components/response-log";
import { sendCommand } from "@/lib/send-command";

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
  const [connected, setConnected] = useState<boolean | null>(null);

  // Check connectivity on mount by calling GET_TEMPLATE
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const data = await sendCommand({ action: "GET_TEMPLATE" });
        if (!cancelled) {
          setConnected(true);
          setResponseData(data);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleResponse = useCallback((data: unknown, payload: unknown) => {
    setResponseData(data);
    setLogEntries((prev) => [
      {
        timestamp: new Date(),
        payload,
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
              <h1 className="text-lg font-bold text-foreground tracking-tight font-sans">
                n8n Workflow Tester
              </h1>
              <p className="text-xs text-muted-foreground">
                Visual Postman for template building
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5">
              <Zap
                className={`h-3.5 w-3.5 ${
                  connected === true
                    ? "text-success"
                    : connected === false
                      ? "text-destructive"
                      : "text-muted-foreground animate-pulse"
                }`}
              />
              <span className="text-xs font-medium text-foreground">
                {connected === true
                  ? "Connected"
                  : connected === false
                    ? "Disconnected"
                    : "Checking..."}
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

      {/* Floating n8n Workflow Embed */}
      <FloatingAssistant />
    </div>
  );
}
