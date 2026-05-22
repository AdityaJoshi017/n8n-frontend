/**
 * Converts a Template JSON object back to Jira text format
 * Reverses the structure: Template → Jira
 */

interface Tab {
  name: string;
  modules?: Module[];
}

interface Module {
  type?: string;
  data?: {
    displayName: string;
    fields?: Field[];
  };
}

interface Field {
  typeName?: string;
  displayName?: string;
  viewType?: string;
  required?: boolean;
  fields?: Field[];
}

interface TemplateData {
  inspectionTypeCode?: string;
  displayName?: string;
  tabs?: Tab[];
}

/**
 * Format template JSON to Jira text with proper indentation
 */
export function formatJsonToJira(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const template = extractTemplate(data);
  if (!template) {
    return "Unable to parse template data";
  }

  const lines: string[] = [];

  // Add metadata headers
  if (template.displayName) {
    lines.push(`Display Name: ${template.displayName}`);
  }
  if (template.inspectionTypeCode) {
    lines.push(`Inspection Type Code: ${template.inspectionTypeCode}`);
  }

  // Add empty line after headers if present
  if (lines.length > 0) {
    lines.push("");
  }

  // Add tabs and their modules
  if (template.tabs && Array.isArray(template.tabs)) {
    template.tabs.forEach((tab) => {
      // Tab header
      lines.push(`Tab ${tab.name}`);

      // Modules under this tab
      if (tab.modules && Array.isArray(tab.modules)) {
        tab.modules.forEach((module) => {
          const moduleName =
            module.data?.displayName || module.type || "Module";
          const moduleType = module.type || module.data?.displayName;

          lines.push(`\t${moduleName}${moduleType ? ` {${moduleType}}` : ""}`);

          // Fields under this module
          if (module.data?.fields && Array.isArray(module.data.fields)) {
            module.data.fields.forEach((field) => {
              formatField(field, lines, 2);
            });
          }
        });
      }

      // Add empty line between tabs
      lines.push("");
    });
  }

  return lines.join("\n").trim();
}

/**
 * Recursively format a field and its children
 */
function formatField(
  field: Field,
  lines: string[],
  indentLevel: number
): void {
  const indent = "\t".repeat(indentLevel);
  const fieldName = field.displayName || field.typeName || "Field";
  const fieldType = field.typeName || "";
  const viewType = field.viewType || "";

  // Build field line
  let fieldLine = `${indent}- ${fieldName}`;

  // Add hints/metadata
  const hints: string[] = [];
  if (fieldType) hints.push(fieldType);
  if (viewType) hints.push(viewType);
  if (field.required) hints.push("required");

  if (hints.length > 0) {
    fieldLine += ` {${hints.join(" ")}}`;
  }

  lines.push(fieldLine);

  // Add nested fields (options or sub-fields)
  if (field.fields && Array.isArray(field.fields)) {
    field.fields.forEach((subField) => {
      formatField(subField, lines, indentLevel + 1);
    });
  }
}

/**
 * Extract template from various response formats
 */
function extractTemplate(data: unknown): TemplateData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Direct template object
  if ("tabs" in obj) {
    return obj as TemplateData;
  }

  // Wrapped in template property
  if (obj.template && typeof obj.template === "object") {
    return obj.template as TemplateData;
  }

  // Array of templates - use first
  if (Array.isArray(data) && data.length > 0) {
    return extractTemplate(data[0]);
  }

  // Wrapped in data property
  if (obj.data && typeof obj.data === "object") {
    return extractTemplate(obj.data);
  }

  return null;
}

/**
 * Parse JSON string and convert to Jira format
 */
export function parseJsonAndFormatJira(jsonString: string): string {
  try {
    const data = JSON.parse(jsonString);
    return formatJsonToJira(data);
  } catch (error) {
    return `Error parsing JSON: ${error instanceof Error ? error.message : "Invalid JSON"}`;
  }
}
