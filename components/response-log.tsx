"use client";

import { useState } from "react";
import { History, ChevronDown, ChevronRight, Clock } from "lucide-react";

interface LogEntry {
  timestamp: Date;
  payload: unknown;
  response: unknown;
}

interface ResponseLogProps {
  entries: LogEntry[];
}

function LogItem({ entry, index }: { entry: LogEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-primary">
          #{index + 1}
        </span>
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          {entry.timestamp.toLocaleTimeString()}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-xs">
          <div className="mb-2">
            <span className="font-semibold text-muted-foreground">Request:</span>
            <pre className="mt-1 overflow-auto rounded bg-secondary p-2 font-mono text-foreground max-h-32">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          </div>
          <div>
            <span className="font-semibold text-muted-foreground">Response:</span>
            <pre className="mt-1 overflow-auto rounded bg-secondary p-2 font-mono text-foreground max-h-32">
              {JSON.stringify(entry.response, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ResponseLog({ entries }: ResponseLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Request History ({entries.length})
        </h3>
      </div>
      <div className="rounded-lg border border-border bg-card overflow-hidden max-h-[300px] overflow-y-auto">
        {entries.map((entry, i) => (
          <LogItem key={i} entry={entry} index={i} />
        ))}
      </div>
    </div>
  );
}
