"use client";

import { useState } from "react";
import {
  Send,
  RotateCcw,
  Terminal,
  FileText,
  ClipboardPaste,
  RefreshCw,
  Layers,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendCommand } from "@/lib/send-command";

type InputMode = "text" | "jira" | "requirement";

interface CommandPanelProps {
  onResponse: (data: unknown, payload: unknown) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

export function CommandPanel({
  onResponse,
  onLoading,
  onError,
}: CommandPanelProps) {
  const [mode, setMode] = useState<InputMode>("text");
  const [input, setInput] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const placeholders: Record<InputMode, string> = {
    text: 'e.g. "add tab Profile" or "please add a profile section"',
    jira: 'Display Name: Test Template\nInspection Type Code: DENTAL\n\nTab Profile\nTeam Module\n- Inspector Name {text 40 characters}',
    requirement:
      "Profile Tab\nTeam module\nPermit#\nRequested By\nContractor\nOwner",
  };

  const buildPayload = (): Record<string, unknown> => {
    switch (mode) {
      case "text":
        return { text: input };
      case "jira":
        return { jiraText: input, dryRun };
      case "requirement":
        return { requirementText: input };
    }
  };

  const execute = async (payload: Record<string, unknown>) => {
    setIsLoading(true);
    onLoading(true);
    onError(null);

    try {
      const data = await sendCommand(payload);
      onResponse(data, payload);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
      onLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await execute(buildPayload());
  };

  const handleReset = async () => {
    await execute({ reset: true });
    setInput("");
  };

  const handleGetTemplate = async () => {
    await execute({ action: "GET_TEMPLATE" });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Command Input
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetTemplate}
            disabled={isLoading}
            className="text-muted-foreground hover:text-primary"
            title="Fetch current template"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Get Template
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isLoading}
            className="text-muted-foreground hover:text-destructive"
            title="Reset template"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as InputMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger
            value="text"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Text Command</span>
            <span className="sm:hidden">Text</span>
          </TabsTrigger>
          <TabsTrigger
            value="jira"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Structured Jira</span>
            <span className="sm:hidden">Jira</span>
          </TabsTrigger>
          <TabsTrigger
            value="requirement"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Requirement Paste</span>
            <span className="sm:hidden">Paste</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Jira Dry Run Toggle */}
      {mode === "jira" && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="accent-primary rounded"
          />
          Dry Run (preview only, no changes applied)
        </label>
      )}

      {/* Textarea Input */}
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders[mode]}
          rows={mode === "text" ? 3 : 8}
          className="w-full rounded-lg border border-border bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="absolute bottom-3 right-3 h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">Send command</span>
        </Button>
      </div>

      {/* Hint + Quick Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            Ctrl
          </kbd>{" "}
          +{" "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          to send
        </p>

        {mode === "text" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setInput('{ "action": "ADD_TAB", "tabName": "" }');
              }}
              className="rounded border border-border bg-secondary px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              title="Insert ADD_TAB action template"
            >
              <Layers className="mr-1 inline h-3 w-3" />
              ADD_TAB
            </button>
            <button
              onClick={() => {
                setInput(
                  '{ "actions": [\n  { "action": "RESET_TABS" },\n  { "action": "ADD_TAB", "tabName": "" }\n] }'
                );
              }}
              className="rounded border border-border bg-secondary px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              title="Insert batch action template"
            >
              <Play className="mr-1 inline h-3 w-3" />
              Batch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
