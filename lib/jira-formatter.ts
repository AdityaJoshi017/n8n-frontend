/**
 * Jira Text Formatter
 * Reformats messy/unstructured Jira descriptions into clean, strictly indented outlines.
 *
 * Hierarchy levels:
 * - Level 0: Tabs/Sections
 * - Level 1: Modules/Groups under a tab
 * - Level 2: Fields under a module
 * - Level 3: Options under a field (for radio/checkbox/dropdown)
 */

const TAB_CHAR = "\t";

interface ParsedLine {
  text: string;
  originalIndent: number;
  isTab: boolean;
  isModule: boolean;
  isField: boolean;
  isOption: boolean;
  isNote: boolean;
  isAmbiguous: boolean;
}

// Patterns to detect structure
const TAB_PATTERNS = [
  /^(.*?)\s*tab\s*$/i,
  /^tab[:\s]+(.*)$/i,
  /^section[:\s]+(.*)$/i,
  /^under\s+/i,
];

const MODULE_PATTERNS = [
  /^(.*?)\s*module\s*$/i,
  /^module[:\s]+(.*)$/i,
  /^(.*?)\s*group\s*$/i,
];

const FIELD_HINT_PATTERN = /\{[^}]+\}/;

const OPTION_INDICATORS = [
  "yes",
  "no",
  "n/a",
  "not applicable",
  "email",
  "mail",
  "scan",
  "auto generated",
  "other",
  "none",
  "select",
  "choose",
];

const PROMPT_PATTERNS = [/^select\s/i, /^choose\s/i, /^pick\s/i, /\?$/];

function countLeadingWhitespace(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  const ws = match[1];
  // Count tabs as 1, spaces as 0.5 (so 2 spaces = 1 level)
  let count = 0;
  for (const char of ws) {
    if (char === "\t") count += 1;
    else count += 0.5;
  }
  return Math.floor(count);
}

function cleanLine(line: string): string {
  return line
    .trim()
    .replace(/^[-_•·▪▸►]+\s*/, "") // Remove leading dashes, bullets
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function isTabLine(text: string): boolean {
  return TAB_PATTERNS.some((p) => p.test(text));
}

function isModuleLine(text: string): boolean {
  return MODULE_PATTERNS.some((p) => p.test(text));
}

function isOptionLike(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    OPTION_INDICATORS.some((opt) => lower === opt || lower.startsWith(opt)) ||
    text.length < 25 // Short items are often options
  );
}

function isPromptLine(text: string): boolean {
  return PROMPT_PATTERNS.some((p) => p.test(text));
}

function hasFieldHint(text: string): boolean {
  return FIELD_HINT_PATTERN.test(text);
}

function parseLine(line: string, prevContext: ParsedLine | null): ParsedLine {
  const originalIndent = countLeadingWhitespace(line);
  const text = cleanLine(line);

  if (!text) {
    return {
      text: "",
      originalIndent,
      isTab: false,
      isModule: false,
      isField: false,
      isOption: false,
      isNote: false,
      isAmbiguous: false,
    };
  }

  const isTab = isTabLine(text);
  const isModule = !isTab && isModuleLine(text);
  const hasHint = hasFieldHint(text);
  const isPrompt = isPromptLine(text);

  // Determine if this is a field based on hints or context
  const isField =
    !isTab &&
    !isModule &&
    (hasHint ||
      isPrompt ||
      (prevContext?.isModule && originalIndent > prevContext.originalIndent));

  // Options are short items that follow a prompt/field
  const isOption =
    !isTab &&
    !isModule &&
    !isField &&
    prevContext &&
    (prevContext.isField || prevContext.isOption) &&
    isOptionLike(text);

  // Notes are descriptive lines that don't fit other categories
  const isNote = !isTab && !isModule && !isField && !isOption && text.length > 50;

  return {
    text,
    originalIndent,
    isTab,
    isModule,
    isField,
    isOption,
    isNote,
    isAmbiguous: !isTab && !isModule && !isField && !isOption && !isNote,
  };
}

function assignLevel(parsed: ParsedLine, prevParsed: ParsedLine | null): number {
  if (parsed.isTab) return 0;
  if (parsed.isModule) return 1;
  if (parsed.isField) return 2;
  if (parsed.isOption) return 3;
  if (parsed.isNote) return prevParsed ? assignLevel(prevParsed, null) : 1;
  // Ambiguous - use indent as hint
  if (parsed.isAmbiguous) {
    if (prevParsed) {
      const prevLevel = assignLevel(prevParsed, null);
      if (parsed.originalIndent > prevParsed.originalIndent) {
        return Math.min(prevLevel + 1, 3);
      }
      if (parsed.originalIndent < prevParsed.originalIndent) {
        return Math.max(prevLevel - 1, 0);
      }
      return prevLevel;
    }
    return 1;
  }
  return 1;
}

export function formatJiraText(input: string): string {
  const lines = input.split("\n");
  const result: string[] = [];
  let prevParsed: ParsedLine | null = null;

  for (const line of lines) {
    const parsed = parseLine(line, prevParsed);

    if (!parsed.text) {
      // Keep empty lines for readability between sections
      if (result.length > 0 && result[result.length - 1] !== "") {
        result.push("");
      }
      continue;
    }

    const level = assignLevel(parsed, prevParsed);
    const indent = TAB_CHAR.repeat(level);
    let formattedText = parsed.text;

    // Add markers as specified
    if (parsed.isNote) {
      formattedText += " (NOTE)";
    }
    if (parsed.isAmbiguous) {
      formattedText += " (AMBIGUOUS)";
    }

    result.push(indent + formattedText);
    prevParsed = parsed;
  }

  // Clean up multiple consecutive empty lines
  return result
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract text content from various file types
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "txt":
    case "text":
      return await file.text();

    case "pdf":
      return await extractFromPDF(file);

    case "docx":
    case "doc":
      return await extractFromWord(file);

    default:
      // Try as plain text
      return await file.text();
  }
}

async function extractFromPDF(file: File): Promise<string> {
  // Dynamic import to avoid bundling issues
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
  }

  return textParts.join("\n\n");
}

async function extractFromWord(file: File): Promise<string> {
  // Dynamic import
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
