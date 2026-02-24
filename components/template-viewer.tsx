"use client";

import { useState, useMemo, useCallback } from "react";
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
  GripVertical,
  MoreVertical,
  Plus,
  PanelLeft,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TemplateViewerProps {
  data: unknown;
  isLoading: boolean;
  error: string | null;
}

type ViewMode = "visual" | "json" | "builder";

interface TemplateField {
  name?: string;
  displayName?: string;
  label?: string;
  type?: string;
  typeName?: string;
  viewType?: string;
  required?: boolean;
  shouldDisplay?: boolean;
  requiredExpression?: string;
  readOnlyExpression?: string;
  hideExpression?: string;
  options?: string[];
  fields?: TemplateField[];
  mappedModuleField?: { field?: unknown[] };
  [key: string]: unknown;
}

interface TemplateModule {
  name?: string;
  displayName?: string;
  label?: string;
  type?: string;
  moduleType?: string;
  allowEditForReview?: boolean;
  fields?: TemplateField[];
  data?: {
    displayName?: string;
    fields?: TemplateField[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface TemplateTab {
  name?: string;
  displayName?: string;
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

/* ────── Helpers to normalize module data shapes ────── */

function getModuleDisplayName(mod: TemplateModule): string {
  return (
    mod.data?.displayName ||
    mod.displayName ||
    mod.name ||
    mod.label ||
    "Unnamed Module"
  );
}

function getModuleType(mod: TemplateModule): string {
  return mod.type || mod.moduleType || "module";
}

function getModuleFields(mod: TemplateModule): TemplateField[] {
  // Support both { fields: [...] } and { data: { fields: [...] } }
  if (mod.data?.fields && Array.isArray(mod.data.fields)) {
    return mod.data.fields;
  }
  if (mod.fields && Array.isArray(mod.fields)) {
    return mod.fields;
  }
  return [];
}

function getModuleAllowEdit(mod: TemplateModule): boolean {
  if (mod.allowEditForReview !== undefined) return !!mod.allowEditForReview;
  if (mod.data && "allowEditForReview" in mod.data)
    return !!(mod.data as Record<string, unknown>).allowEditForReview;
  return false;
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

/* ──────────────────────── Visual Tree View ──────────────────────── */

function TreeNode({
  label,
  icon,
  type,
  children,
  depth = 0,
  defaultExpanded = true,
}: {
  label: string;
  icon: React.ReactNode;
  type?: string;
  children?: React.ReactNode;
  depth?: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
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

/** Recursively render fields in the Visual tree */
function FieldTreeNode({
  field,
  depth,
}: {
  field: TemplateField;
  depth: number;
}) {
  const fieldName =
    field.displayName || field.name || field.label || field.typeName || "Field";
  const fieldType = field.viewType || field.type || field.typeName;
  const subFields = field.fields || [];
  const options = field.options || [];
  const hasChildren = subFields.length > 0 || options.length > 0;

  return (
    <TreeNode
      label={fieldName}
      icon={<FormInput className="h-3.5 w-3.5" />}
      type={fieldType}
      depth={depth}
      defaultExpanded={false}
    >
      {hasChildren ? (
        <>
          {subFields.map((sf, i) => (
            <FieldTreeNode key={i} field={sf} depth={depth + 1} />
          ))}
          {options.map((opt, i) => (
            <TreeNode
              key={`opt-${i}`}
              label={String(opt)}
              icon={<CircleDot className="h-3 w-3" />}
              depth={depth + 1}
            />
          ))}
        </>
      ) : undefined}
    </TreeNode>
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
            label={tab.name || tab.displayName || tab.label || `Tab ${i + 1}`}
            icon={<Layers className="h-3.5 w-3.5" />}
            depth={0}
          >
            {(tab.modules || tab.sections || []).map(
              (mod: TemplateModule, j: number) => {
                const modFields = getModuleFields(mod);
                return (
                  <TreeNode
                    key={j}
                    label={getModuleDisplayName(mod)}
                    icon={<Box className="h-3.5 w-3.5" />}
                    type={getModuleType(mod)}
                    depth={1}
                  >
                    {modFields.length > 0
                      ? modFields.map((field, k) => (
                          <FieldTreeNode key={k} field={field} depth={2} />
                        ))
                      : undefined}
                  </TreeNode>
                );
              }
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
              defaultExpanded={false}
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

/* ──────────────────────── JSON View ──────────────────────── */

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
      <pre className="overflow-auto rounded-lg bg-secondary p-4 text-xs font-mono text-foreground leading-relaxed max-h-[600px]">
        {json}
      </pre>
    </div>
  );
}

/* ──────────────────────── Builder View ──────────────────────── */

const TAB_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

interface SelectedItem {
  type: "tab" | "module" | "field";
  tabIndex: number;
  moduleIndex?: number;
  fieldIndex?: number;
}

function BuilderModuleCard({
  mod,
  tabIndex,
  moduleIndex,
  selected,
  onSelect,
}: {
  mod: TemplateModule;
  tabIndex: number;
  moduleIndex: number;
  selected: boolean;
  onSelect: (item: SelectedItem) => void;
}) {
  const modFields = getModuleFields(mod);
  return (
    <div className="flex flex-col">
      <button
        onClick={() =>
          onSelect({ type: "module", tabIndex, moduleIndex })
        }
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all ${
          selected
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border bg-card hover:border-muted-foreground/30"
        }`}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="truncate text-sm font-medium text-foreground">
            {getModuleDisplayName(mod)}
          </span>
          <span className="truncate text-xs text-muted-foreground font-mono">
            {getModuleType(mod)}
          </span>
        </div>
        {modFields.length > 0 && (
          <span className="ml-auto mr-1 shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {modFields.length}
            {modFields.length === 1 ? " field" : " fields"}
          </span>
        )}
        <button
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </button>
    </div>
  );
}

/* ──── Properties Panel ──── */

function PropertiesPanel({
  selectedItem,
  template,
}: {
  selectedItem: SelectedItem | null;
  template: TemplateData;
}) {
  if (!selectedItem) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <PanelLeft className="h-8 w-8 opacity-30" />
        <p className="text-sm">Select a tab, module, or field</p>
        <p className="text-xs">Properties will appear here</p>
      </div>
    );
  }

  const tabs = template.tabs || [];
  const tab = tabs[selectedItem.tabIndex];
  if (!tab) return null;

  if (selectedItem.type === "tab") {
    return (
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">
          {"Properties - "}
          {tab.displayName || tab.name || tab.label || "Tab"}
        </h3>
        <PropertyField
          label="Tab Name"
          value={tab.displayName || tab.name || tab.label || ""}
        />
        <PropertyField
          label="Tab Key"
          value={tab.name || ""}
          hint={`Key: ${tab.name || "N/A"}`}
        />
        <div className="text-xs text-muted-foreground">
          {"Modules: "}
          {(tab.modules || tab.sections || []).length}
        </div>
      </div>
    );
  }

  const modules = tab.modules || tab.sections || [];

  if (
    selectedItem.type === "module" &&
    selectedItem.moduleIndex !== undefined
  ) {
    const mod = modules[selectedItem.moduleIndex];
    if (!mod) return null;
    const modFields = getModuleFields(mod);

    return (
      <div className="flex flex-col gap-4 pb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {"Properties - "}
          {getModuleDisplayName(mod)}
        </h3>

        <PropertyField
          label="Module Type"
          value={getModuleType(mod)}
          hint={`Type: ${getModuleType(mod)}`}
        />
        <PropertyField
          label="Display Name"
          value={getModuleDisplayName(mod)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="allow-edit"
            checked={getModuleAllowEdit(mod)}
            disabled
          />
          <label
            htmlFor="allow-edit"
            className="text-sm text-foreground"
          >
            Allow Edit for Review
          </label>
        </div>

        {/* Fields section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-sm font-semibold text-foreground">
              {"Fields ("}
              {modFields.length}
              {")"}
            </span>
            <button className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {modFields.length > 0 ? (
            <div className="flex flex-col gap-2">
              {modFields.map((field, k) => (
                <FieldPropertyCard key={k} field={field} depth={0} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/50 py-4 text-center text-xs text-muted-foreground">
              No Fields
            </div>
          )}
        </div>
      </div>
    );
  }

  if (
    selectedItem.type === "field" &&
    selectedItem.moduleIndex !== undefined &&
    selectedItem.fieldIndex !== undefined
  ) {
    const mod = modules[selectedItem.moduleIndex];
    if (!mod) return null;
    const modFields = getModuleFields(mod);
    const field = modFields[selectedItem.fieldIndex];
    if (!field) return null;

    return (
      <div className="flex flex-col gap-4 pb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {"Properties - "}
          {field.displayName || field.name || field.label || "Field"}
        </h3>
        <FieldDetailProperties field={field} />
      </div>
    );
  }

  return null;
}

/** Full field property view for the right panel */
function FieldDetailProperties({ field }: { field: TemplateField }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          id="field-required"
          checked={!!field.required}
          disabled
        />
        <label htmlFor="field-required" className="text-sm text-foreground">
          Required
        </label>
      </div>
      <PropertyField
        label="Display Name"
        value={field.displayName || field.name || field.label || ""}
      />
      <PropertyField
        label="Type Name"
        value={field.typeName || field.type || ""}
      />
      <PropertySelect
        label="View Type"
        value={field.viewType || field.type || "Text"}
        options={[
          "Text",
          "Checkbox",
          "Radio",
          "Date",
          "DateTime",
          "Number",
          "Multiline",
          "multiLine",
          "NestedFields",
          "Generic REIT",
          "Generic List",
        ]}
      />
      <PropertyField
        label="Required Expression (optional)"
        value={field.requiredExpression || ""}
        placeholder="Required Expression (optional)"
      />
      <PropertyField
        label="Read Only Expression"
        value={field.readOnlyExpression || ""}
        placeholder="Read Only Expression"
      />
      <PropertyField
        label="Hide Expression"
        value={field.hideExpression || ""}
        placeholder="Hide Expression"
      />
      {field.shouldDisplay !== undefined && (
        <div className="flex items-center gap-2">
          <Checkbox checked={!!field.shouldDisplay} disabled />
          <span className="text-sm text-foreground">Should Display</span>
        </div>
      )}

      {/* Sub-fields */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-sm font-semibold text-foreground">
            {"Fields ("}
            {(field.fields || []).length}
            {")"}
          </span>
          <button className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {(field.fields || []).length > 0 ? (
          <div className="flex flex-col gap-2">
            {(field.fields || []).map((subField, l) => (
              <FieldPropertyCard key={l} field={subField} depth={1} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-secondary/50 py-4 text-center text-xs text-muted-foreground">
            No Fields
          </div>
        )}
      </div>

      {/* Options */}
      {field.options && field.options.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-foreground">
            {"Options ("}
            {field.options.length}
            {")"}
          </span>
          <div className="flex flex-col gap-1.5">
            {field.options.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground"
              >
                <CircleDot className="h-3 w-3 text-primary" />
                {String(opt)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Collapsible field card used inside the Properties panel */
function FieldPropertyCard({
  field,
  depth,
}: {
  field: TemplateField;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const fieldName =
    field.displayName || field.name || field.label || field.typeName || "Field";

  return (
    <div
      className={`rounded-lg border border-border bg-card ${depth > 0 ? "ml-2" : ""}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/20">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-primary" />
          ) : (
            <FormInput className="h-3 w-3 text-primary" />
          )}
        </div>
        <span className="truncate text-sm font-medium text-foreground">
          {fieldName}
        </span>
        {field.viewType && (
          <span className="ml-auto mr-1 shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {field.viewType}
          </span>
        )}
        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <button
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fields
          </span>
          <div className="flex items-center gap-2">
            <Checkbox checked={!!field.required} disabled />
            <span className="text-sm text-foreground">Required</span>
          </div>
          <PropertyField
            label="Display Name"
            value={
              field.displayName || field.name || field.label || ""
            }
          />
          <PropertyField
            label="Type Name"
            value={field.typeName || field.type || ""}
          />
          <PropertySelect
            label="View Type"
            value={field.viewType || field.type || "Text"}
            options={[
              "Text",
              "Checkbox",
              "Radio",
              "Date",
              "DateTime",
              "Number",
              "Multiline",
              "multiLine",
              "NestedFields",
            ]}
          />
          <PropertyField
            label="Required Expression (optional)"
            value={field.requiredExpression || ""}
          />
          <PropertyField
            label="Read Only Expression"
            value={field.readOnlyExpression || ""}
          />
          <PropertyField
            label="Hide Expression"
            value={field.hideExpression || ""}
          />
          {/* Nested sub-fields */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {"Fields ("}
                {(field.fields || []).length}
                {")"}
              </span>
              <button className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {(field.fields || []).length > 0 ? (
              <div className="flex flex-col gap-2">
                {(field.fields || []).map((sf, i) => (
                  <FieldPropertyCard
                    key={i}
                    field={sf}
                    depth={depth + 1}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded border border-border bg-secondary/50 py-2 text-center text-[10px] text-muted-foreground">
                No Fields
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyField({
  label,
  value,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        value={value}
        readOnly
        placeholder={placeholder || label}
        className="h-8 text-sm bg-secondary/50 border-border"
      />
      {hint && (
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      )}
    </div>
  );
}

function PropertySelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  // Ensure current value is in the options list
  const allOptions = options.includes(value)
    ? options
    : [value, ...options];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={value} disabled>
        <SelectTrigger className="h-8 w-full bg-secondary/50 border-border text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ──────────────────────── Builder View ──────────────────────── */

function BuilderView({ data }: { data: TemplateData }) {
  const tabs = data.tabs || [];
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(
    null
  );
  const [collapsedTabs, setCollapsedTabs] = useState<Set<number>>(
    new Set()
  );

  const toggleTab = (index: number) => {
    setCollapsedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-lg border border-border">
      {/* Left Panel - Tabs & Modules Tree */}
      <div className="flex w-1/2 flex-col border-r border-border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">
            Tabs
          </span>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs bg-primary text-primary-foreground"
          >
            <Plus className="h-3 w-3" />
            Add Tab
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {tabs.length > 0 ? (
              tabs.map((tab, ti) => {
                const modules = tab.modules || tab.sections || [];
                const isCollapsed = collapsedTabs.has(ti);
                const colorClass = TAB_COLORS[ti % TAB_COLORS.length];
                const isTabSelected =
                  selectedItem?.type === "tab" &&
                  selectedItem.tabIndex === ti;

                return (
                  <div key={ti} className="flex flex-col">
                    {/* Tab Header */}
                    <div
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 ${
                        isTabSelected
                          ? "bg-primary/10"
                          : "hover:bg-secondary/50"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      <button
                        onClick={() => toggleTab(ti)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${colorClass}`}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3 w-3 text-white" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-white" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          setSelectedItem({
                            type: "tab",
                            tabIndex: ti,
                          })
                        }
                        className="flex-1 text-left text-sm font-semibold text-foreground"
                      >
                        {tab.displayName ||
                          tab.name ||
                          tab.label ||
                          `Tab ${ti + 1}`}
                      </button>
                      <Button
                        size="sm"
                        className="h-6 gap-1 text-[10px] bg-primary text-primary-foreground"
                      >
                        Add Module
                      </Button>
                      <button className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Modules under tab */}
                    {!isCollapsed && (
                      <div className="flex flex-col gap-1.5 pb-2 pl-7 pr-2 pt-1">
                        {modules.map(
                          (mod: TemplateModule, mi: number) => (
                            <BuilderModuleCard
                              key={mi}
                              mod={mod}
                              tabIndex={ti}
                              moduleIndex={mi}
                              selected={
                                !!(
                                  selectedItem &&
                                  selectedItem.tabIndex === ti &&
                                  selectedItem.moduleIndex === mi &&
                                  (selectedItem.type === "module" ||
                                    selectedItem.type === "field")
                                )
                              }
                              onSelect={setSelectedItem}
                            />
                          )
                        )}
                        {modules.length === 0 && (
                          <div className="py-3 text-center text-xs text-muted-foreground">
                            No modules
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                <Layers className="h-8 w-8 opacity-30" />
                <p className="text-xs">No tabs in template</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Properties */}
      <div className="flex w-1/2 flex-col bg-background">
        <div className="border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">
            Properties
          </span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4">
            <PropertiesPanel
              selectedItem={selectedItem}
              template={data}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

/* ──────────────────────── Main TemplateViewer ──────────────────────── */

export function TemplateViewer({
  data,
  isLoading,
  error,
}: TemplateViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("builder");
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(560);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startY = e.clientY;
      const startH = height;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientY - startY;
        setHeight(Math.max(300, Math.min(1200, startH + delta)));
      };
      const onUp = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [height]
  );

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
        <p className="text-xs">
          Send a command to see the workflow output here
        </p>
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
        <div className="flex items-center gap-2">
          {viewMode === "builder" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">
                {expanded ? "Collapse" : "Expand"}
              </span>
            </Button>
          )}
          <div className="flex rounded-lg border border-border bg-secondary p-0.5">
            <button
              onClick={() => setViewMode("builder")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "builder"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PanelLeft className="h-3.5 w-3.5" />
              Builder
            </button>
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
      </div>

      {viewMode === "builder" && template ? (
        <div className="flex flex-col">
          <div
            style={{
              height: expanded ? "calc(100vh - 200px)" : `${height}px`,
            }}
            className="transition-[height] duration-200"
          >
            <BuilderView data={template} />
          </div>
          {/* Resize handle */}
          {!expanded && (
            <div
              onMouseDown={handleResizeStart}
              className={`mx-auto mt-1 flex h-3 w-20 cursor-row-resize items-center justify-center rounded-full transition-colors ${
                isResizing
                  ? "bg-primary/30"
                  : "bg-border hover:bg-primary/20"
              }`}
            >
              <div className="h-0.5 w-8 rounded-full bg-muted-foreground/40" />
            </div>
          )}
        </div>
      ) : viewMode === "visual" && template ? (
        <div className="rounded-lg border border-border bg-card p-3 min-h-[200px] max-h-[700px] overflow-auto">
          <VisualView data={template} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-3 min-h-[200px]">
          <JsonView data={data} />
        </div>
      )}
    </div>
  );
}
