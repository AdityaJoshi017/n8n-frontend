"use client";

import { useState } from "react";
import { Send, RotateCcw, Terminal, FileText, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CommandMode = "TEXT" | "STRUCTURED_JIRA" | "REQUIREMENT_IMPORT";

interface CommandPanelProps {
  onResponse: (data: unknown) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

export function CommandPanel({ onResponse, onLoading, onError }: CommandPanelProps) {
  const [mode, setMode] = useState<CommandMode>("TEXT");
  const [input, setInput] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const placeholders: Record<CommandMode, string> = {
    TEXT: 'e.g. "please add a profile section for me"',
    STRUCTURED_JIRA:
      'Display Name: Test Template\nInspection Type Code: DENTAL\n\nTab Profile\nTeam Module\n- Inspector Name {text 40 characters}',
    REQUIREMENT_IMPORT:
      "Profile Tab\nTeam module\nPermit#\nRequested By\nContractor\nOwner",
  };

  const buildPayload = () => {
    switch (mode) {
      case "TEXT":
        return { text: input };
      case "STRUCTURED_JIRA":
        return {
          action: "IMPORT_JIRA_TEXT",
          dryRun,
          jiraText: input,
        };
      case "REQUIREMENT_IMPORT":
        return {
          mode: "REQUIREMENT_IMPORT",
          payload: {
            rawText: input,
          },
        };
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    onLoading(true);
    onError(null);

    try {
      const payload = buildPayload();
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      onResponse(data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
      onLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    onLoading(true);
    onError(null);

    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });

      const data = await res.json();
      onResponse(data);
      setInput("");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setIsLoading(false);
      onLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Command Input
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isLoading}
          className="text-muted-foreground hover:text-destructive"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      <Tabs
        value={mode}
        onValueChange={(v) => setMode(v as CommandMode)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger
            value="TEXT"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Text Command</span>
            <span className="sm:hidden">Text</span>
          </TabsTrigger>
          <TabsTrigger
            value="STRUCTURED_JIRA"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Structured Jira</span>
            <span className="sm:hidden">Jira</span>
          </TabsTrigger>
          <TabsTrigger
            value="REQUIREMENT_IMPORT"
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Requirement Paste</span>
            <span className="sm:hidden">Paste</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === "STRUCTURED_JIRA" && (
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

      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders[mode]}
          rows={mode === "TEXT" ? 3 : 8}
          className="w-full rounded-lg border border-border bg-secondary px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="absolute bottom-3 right-3 h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send command</span>
        </Button>
      </div>

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
    </div>
  );
}
