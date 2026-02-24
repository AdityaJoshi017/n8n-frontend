"use client";

import { useState } from "react";
import {
  LayoutTemplate,
  Code2,
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  FormInput,
  CircleDot,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateViewerProps {
  data: unknown;
  isLoading: boolean;
  error: string | null;
}

type ViewMode = "visual" | "json";

interface TemplateField {
  name?: string;
  label?: string;
  type?: string;
  options?: string[];
  [key: string]: unknown;
}

interface TemplateModule {
  name?: string;
  label?: string;
  type?: string;
  fields?: TemplateField[];
  [key: string]: unknown;
}

interface TemplateTab {
  name?: string;
  label?: string;
  modules?: TemplateModule[];
  sections?: TemplateModule[];
  [key: string]: unknown;
}

interface TemplateData {
  displayName?: string;
  name?: string;
  tabs?: TemplateTab[];
  template?: {
    displayName?: string;
    name?: string;
    tabs?: TemplateTab[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function extractTemplate(data: unknown): TemplateData | null {
  if (!data || typeof data !== "object") return null;

  const d = data as Record<string, unknown>;

  if (d.template && typeof d.template === "object") {
    return d.template as TemplateData;
  }

  if (d.tabs || d.displayName || d.name) {
    return d as TemplateData;
  }

  if (Array.isArray(data) && data.length > 0) {
    return extractTemplate(data[0]);
  }

  return d as TemplateData;
}

function TreeNode({
  label,
  icon,
  type,
  children,
  depth = 0,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  children?: React.ReactNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = !!children;

  return (
    <div className={depth > 0 ? "ml-4 border-l border-border pl-3" : ""}>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary ${
          hasChildren ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="shrink-0 text-primary">{icon}</span>
        <span className="font-medium text-foreground">{label}</span>
        {type && (
          <span className="ml-auto shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {type}
          </span>
        )}
      </button>
      {expanded && children && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

function VisualView({ data }: { data: TemplateData }) {
  const tabs = data.tabs || [];
  const templateName = data.displayName || data.name || "Template";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2 py-2">
        <LayoutTemplate className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {templateName}
        </span>
      </div>
      {tabs.length > 0 ? (
        tabs.map((tab, i) => (
          <TreeNode
            key={i}
            label={tab.name || tab.label || `Tab ${i + 1}`}
            icon={<Layers className="h-3.5 w-3.5" />}
            depth={0}
          >
            {(tab.modules || tab.sections || []).map(
              (mod: TemplateModule, j: number) => (
                <TreeNode
                  key={j}
                  label={mod.name || mod.label || `Module ${j + 1}`}
                  icon={<Box className="h-3.5 w-3.5" />}
                  type={mod.type}
                  depth={1}
                >
                  {(mod.fields || []).map(
                    (field: TemplateField, k: number) => (
                      <TreeNode
                        key={k}
                        label={
                          field.name || field.label || `Field ${k + 1}`
                        }
                        icon={<FormInput className="h-3.5 w-3.5" />}
                        type={field.type}
                        depth={2}
                      >
                        {field.options && field.options.length > 0
                          ? field.options.map((opt, l) => (
                              <TreeNode
                                key={l}
                                label={String(opt)}
                                icon={
                                  <CircleDot className="h-3 w-3" />
                                }
                                depth={3}
                              />
                            ))
                          : undefined}
                      </TreeNode>
                    )
                  )}
                </TreeNode>
              )
            )}
          </TreeNode>
        ))
      ) : (
        <RawObjectView data={data} />
      )}
    </div>
  );
}

function RawObjectView({ data }: { data: unknown }) {
  if (data === null || data === undefined) return null;

  if (typeof data !== "object") {
    return (
      <span className="text-sm text-muted-foreground">{String(data)}</span>
    );
  }

  const entries = Object.entries(data as Record<string, unknown>);

  return (
    <div className="flex flex-col gap-1 pl-2">
      {entries.map(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          return (
            <TreeNode
              key={key}
              label={key}
              icon={
                Array.isArray(value) ? (
                  <Layers className="h-3.5 w-3.5" />
                ) : (
                  <Box className="h-3.5 w-3.5" />
                )
              }
              type={Array.isArray(value) ? `[${value.length}]` : "object"}
              depth={0}
            >
              {Array.isArray(value)
                ? value.map((item, i) => (
                    <RawObjectView key={i} data={item} />
                  ))
                : <RawObjectView data={value} />}
            </TreeNode>
          );
        }
        return (
          <div
            key={key}
            className="flex items-center gap-2 px-2 py-1 text-sm"
          >
            <span className="text-muted-foreground">{key}:</span>
            <span className="font-mono text-foreground">{String(value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function JsonView({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">Copy JSON</span>
      </Button>
      <pre className="overflow-auto rounded-lg bg-secondary p-4 text-xs font-mono text-foreground leading-relaxed max-h-[500px]">
        {json}
      </pre>
    </div>
  );
}

export function TemplateViewer({ data, isLoading, error }: TemplateViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("visual");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
        <p className="text-sm">Sending to workflow...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <LayoutTemplate className="h-10 w-10 opacity-30" />
        <p className="text-sm">No response yet</p>
        <p className="text-xs">Send a command to see the workflow output here</p>
      </div>
    );
  }

  const template = extractTemplate(data);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Response
        </h2>
        <div className="flex rounded-lg border border-border bg-secondary p-0.5">
          <button
            onClick={() => setViewMode("visual")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "visual"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Visual
          </button>
          <button
            onClick={() => setViewMode("json")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "json"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            JSON
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 min-h-[200px]">
        {viewMode === "visual" && template ? (
          <VisualView data={template} />
        ) : (
          <JsonView data={data} />
        )}
      </div>
    </div>
  );
}
