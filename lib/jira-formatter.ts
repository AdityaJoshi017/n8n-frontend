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

// Heuristics: lines with these hints are likely choice fields expecting options beneath.
const CHOICE_HINT_PATTERN =
  /\{[^}]*\b(checkbox|check box|radio|radio group|single-select|dropdown|drop down|select)\b[^}]*\}/i;

// Heuristics: lines that look like section headers / notes (should not become modules)
const NOTE_LIKE_PATTERN =
  /(no calculations needed|srps will handle|pre[- ]?loaded|prepopulated|this report will always be generated|dev note|question:)/i;

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
    // Remove leading bullets/markers often used in Jira exports
    .replace(/^[-_•·▪▸►]+\s*/, "")
    .replace(/^(?:o|O)\s+/, "")
    .replace(/^[•]+\s*/, "")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function preprocessInput(input: string): string {
  // Normalize escape sequences commonly present when Jira text is copied from JSON.
  return String(input || "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function expandUnderHierarchy(text: string): string[] | null {
  // Example:
  // "Under Final Actions > Inspection Outcomes" -> ["Final Actions", "Inspection Outcomes"]
  const m = text.match(/^under\s+(.+)$/i);
  if (!m || !m[1]) return null;
  const chain = m[1]
    .split(">")
    .map((s) => cleanLine(s))
    .filter(Boolean);
  return chain.length ? chain : null;
}

function isTabLine(text: string): boolean {
  return TAB_PATTERNS.some((p) => p.test(text));
}

function isModuleLine(text: string): boolean {
  if (MODULE_PATTERNS.some((p) => p.test(text))) return true;
  // Also treat explicit module hints in braces as modules.
  if (
    /\{[^}]*\b(module|generic module|generic list|list module|team module|regulated entity module|compliance contact|responsible contact)\b[^}]*\}/i.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

function isOptionLike(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    OPTION_INDICATORS.some((opt) => lower === opt || lower.startsWith(opt))
  )
    return true;
  // Compact labels: 1-3 words, not ending with ':' and not containing braces.
  const words = text.split(/\s+/).filter(Boolean);
  if (
    words.length >= 1 &&
    words.length <= 3 &&
    text.length <= 32 &&
    !text.includes("{") &&
    !text.endsWith(":")
  ) {
    if (
      /\b(tab|module|section name|checklist item options|checklist media options)\b/i.test(
        text
      )
    )
      return false;
    return true;
  }
  return false;
}

function isPromptLine(text: string): boolean {
  return PROMPT_PATTERNS.some((p) => p.test(text));
}

function isChoiceField(text: string): boolean {
  if (isPromptLine(text)) return true;
  if (CHOICE_HINT_PATTERN.test(text)) return true;
  if (/\b(select|choose|pick)\b/i.test(text)) return true;
  if (/^checklist\s+(item\s+options|options)$/i.test(text)) return true;
  if (/^delivery\s+(options|methods)$/i.test(text)) return true;
  return false;
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
  const isChoice = isChoiceField(text);

  // Determine if this is a field based on hints or context
  const isField =
    !isTab &&
    !isModule &&
    (hasHint ||
      isChoice ||
      (prevContext?.isModule && originalIndent > prevContext.originalIndent));

  // Options are short items that follow a prompt/field
  const isOption =
    !isTab &&
    !isModule &&
    !isField &&
    prevContext !== null &&
    (prevContext.isField || prevContext.isOption) &&
    (isChoiceField(prevContext.text) || prevContext.isOption) &&
    isOptionLike(text);

  // Notes are descriptive lines that don't fit other categories
  const isNote =
    !isTab &&
    !isModule &&
    !isField &&
    !isOption &&
    (text.length > 60 || NOTE_LIKE_PATTERN.test(text));

  // Suppress unused variable warning
  void isPrompt;

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
  const normalized = preprocessInput(input);
  const lines = normalized.split("\n");
  const result: string[] = [];
  let prevParsed: ParsedLine | null = null;

  for (const line of lines) {
    // Expand "Under A > B > C" into explicit hierarchy lines.
    const cleaned = cleanLine(line);
    const underChain = cleaned ? expandUnderHierarchy(cleaned) : null;
    if (underChain) {
      // Emit hierarchy lines as separate lines with increasing indentation.
      for (let i = 0; i < underChain.length; i++) {
        const virtualLine = TAB_CHAR.repeat(i) + underChain[i];
        const parsedVirtual = parseLine(virtualLine, prevParsed);
        if (!parsedVirtual.text) continue;
        const levelVirtual = assignLevel(parsedVirtual, prevParsed);
        result.push(TAB_CHAR.repeat(levelVirtual) + parsedVirtual.text);
        prevParsed = parsedVirtual;
      }
      continue;
    }

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
