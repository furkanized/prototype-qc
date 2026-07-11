// Smart Task Builder condition language. Researchers describe measurable
// success conditions in a human-readable command language —
//
//   Click [Flight List]
//   AND Select [TK1815]
//   AND ( Select [12A] OR Select [12B] )
//   AND NOT Click [Offload]
//   Type "John"
//
// — which is parsed into a small AST and evaluated live against the semantic
// event stream (see semanticEvents.ts). No code, no DOM selectors.

import type { SemanticEvent, SemanticEventType } from "./semanticEvents";
import { normalizeLabel } from "./semanticEvents";

// ---------------------------------------------------------------------------
// Grammar
// ---------------------------------------------------------------------------

export type CommandAction =
  | "Click" | "Open" | "Select" | "Choose" | "Navigate" | "Input"
  | "Type" | "Check" | "Toggle" | "Submit" | "Complete" | "Wait";

export const COMMAND_ACTIONS: Array<{ action: CommandAction; hint: string; textArgument?: boolean }> = [
  { action: "Click", hint: "A button or interactive control is clicked" },
  { action: "Open", hint: "A panel, dialog or dropdown is opened" },
  { action: "Select", hint: "An option, row or list item is selected" },
  { action: "Choose", hint: "An item is chosen (synonym of Select)" },
  { action: "Navigate", hint: "A screen or view becomes active" },
  { action: "Input", hint: "A field's value is changed" },
  { action: "Type", hint: "Specific text is typed anywhere", textArgument: true },
  { action: "Check", hint: "A checkbox is checked" },
  { action: "Toggle", hint: "A switch is toggled" },
  { action: "Submit", hint: "A form is submitted" },
  { action: "Complete", hint: "A named flow finishes" },
  { action: "Wait", hint: "A screen is shown (waits for it)" },
];

/** Which semantic events satisfy each action verb. */
const ACTION_EVENT_TYPES: Record<CommandAction, SemanticEventType[]> = {
  Click: ["ButtonClicked", "PanelOpened", "OptionSelected", "ItemChosen"],
  Open: ["PanelOpened", "DropdownOpened", "ScreenShown"],
  Select: ["OptionSelected", "ItemChosen"],
  Choose: ["ItemChosen", "OptionSelected"],
  Navigate: ["NavigationCompleted", "ScreenShown"],
  Input: ["InputChanged", "TextEntered"],
  Type: ["TextEntered", "InputChanged"],
  Check: ["CheckboxChecked"],
  Toggle: ["SwitchToggled", "CheckboxChecked"],
  Submit: ["FormSubmitted", "ButtonClicked"],
  Complete: ["FlowCompleted", "NavigationCompleted"],
  Wait: ["ScreenShown", "NavigationCompleted"],
};

export interface Command {
  action: CommandAction;
  /** Bracket target — `Click [Flight List]`. Empty for pure-text commands. */
  target: string;
  /** Quoted text argument — `Type "John"`. */
  text?: string;
}

export type ConditionNode =
  | { kind: "cmd"; command: Command }
  | { kind: "not"; child: ConditionNode }
  | { kind: "and"; children: ConditionNode[] }
  | { kind: "or"; children: ConditionNode[] };

export interface ParseIssue {
  line: number; // 1-based line in the script
  message: string;
}

export interface ParsedScript {
  node: ConditionNode | null;
  commands: Command[];
  issues: ParseIssue[];
}

const ACTION_SET = new Set<string>(COMMAND_ACTIONS.map((entry) => entry.action));

type Token =
  | { type: "cmd"; command: Command; line: number }
  | { type: "and" | "or" | "not" | "lparen" | "rparen"; line: number };

function tokenize(script: string, issues: ParseIssue[]): Token[] {
  const tokens: Token[] = [];
  const lines = script.split("\n");
  lines.forEach((raw, index) => {
    const line = index + 1;
    let rest = raw.trim();
    while (rest.length) {
      const upper = rest.toUpperCase();
      if (upper.startsWith("AND")) { tokens.push({ type: "and", line }); rest = rest.slice(3).trim(); continue; }
      if (upper.startsWith("OR")) { tokens.push({ type: "or", line }); rest = rest.slice(2).trim(); continue; }
      if (upper.startsWith("NOT")) { tokens.push({ type: "not", line }); rest = rest.slice(3).trim(); continue; }
      if (rest.startsWith("(")) { tokens.push({ type: "lparen", line }); rest = rest.slice(1).trim(); continue; }
      if (rest.startsWith(")")) { tokens.push({ type: "rparen", line }); rest = rest.slice(1).trim(); continue; }

      const match = /^([A-Za-z]+)\s*(\[([^\]]*)\])?\s*("([^"]*)"|“([^”]*)”)?/.exec(rest);
      if (!match || !match[1]) {
        issues.push({ line, message: `Cannot read "${rest.slice(0, 24)}" — expected a command like Click [Target]` });
        return; // abandon the rest of this line
      }
      const verb = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
      if (!ACTION_SET.has(verb)) {
        issues.push({ line, message: `Unknown action "${match[1]}" — try Click, Select, Type, Navigate…` });
        return;
      }
      const action = verb as CommandAction;
      const target = (match[3] ?? "").trim();
      const text = (match[5] ?? match[6])?.trim();
      const spec = COMMAND_ACTIONS.find((entry) => entry.action === action)!;
      if (spec.textArgument && !text && !target) {
        issues.push({ line, message: `${action} needs quoted text — e.g. Type "John"` });
        return;
      }
      if (!spec.textArgument && !target) {
        issues.push({ line, message: `${action} needs a target — e.g. ${action} [Flight List]` });
        return;
      }
      tokens.push({ type: "cmd", command: { action, target, text }, line });
      rest = rest.slice(match[0].length).trim();
      if (rest && match[0].length === 0) return; // safety against zero-length loops
    }
  });
  return tokens;
}

// Recursive-descent parser. Precedence: NOT > AND > OR. A bare newline between
// two commands (no connector) is treated as an implicit AND, matching the
// "one condition per line" authoring style.
function parseTokens(tokens: Token[], issues: ParseIssue[]): ConditionNode | null {
  let position = 0;
  const peek = () => tokens[position];

  const parsePrimary = (): ConditionNode | null => {
    const token = peek();
    if (!token) return null;
    if (token.type === "not") {
      position += 1;
      const child = parsePrimary();
      if (!child) { issues.push({ line: token.line, message: "NOT needs a condition after it" }); return null; }
      return { kind: "not", child };
    }
    if (token.type === "lparen") {
      position += 1;
      const inner = parseOr();
      if (peek()?.type === "rparen") position += 1;
      else issues.push({ line: token.line, message: "Missing closing parenthesis" });
      return inner;
    }
    if (token.type === "cmd") {
      position += 1;
      return { kind: "cmd", command: token.command };
    }
    issues.push({ line: token.line, message: `Unexpected "${token.type.toUpperCase()}"` });
    position += 1;
    return null;
  };

  const parseAnd = (): ConditionNode | null => {
    const children: ConditionNode[] = [];
    let first = parsePrimary();
    if (first) children.push(first);
    while (peek() && (peek()!.type === "and" || peek()!.type === "cmd" || peek()!.type === "not" || peek()!.type === "lparen")) {
      if (peek()!.type === "and") position += 1; // explicit AND; otherwise implicit
      const next = parsePrimary();
      if (!next) break;
      children.push(next);
    }
    if (children.length === 0) return null;
    return children.length === 1 ? children[0] : { kind: "and", children };
  };

  const parseOr = (): ConditionNode | null => {
    const children: ConditionNode[] = [];
    const first = parseAnd();
    if (first) children.push(first);
    while (peek()?.type === "or") {
      position += 1;
      const next = parseAnd();
      if (!next) break;
      children.push(next);
    }
    if (children.length === 0) return null;
    return children.length === 1 ? children[0] : { kind: "or", children };
  };

  const node = parseOr();
  if (peek()) issues.push({ line: peek()!.line, message: "Unexpected trailing input" });
  return node;
}

export function collectCommands(node: ConditionNode | null, into: Command[] = []): Command[] {
  if (!node) return into;
  if (node.kind === "cmd") into.push(node.command);
  else if (node.kind === "not") collectCommands(node.child, into);
  else node.children.forEach((child) => collectCommands(child, into));
  return into;
}

export function parseConditionScript(script: string): ParsedScript {
  const issues: ParseIssue[] = [];
  const trimmed = script.trim();
  if (!trimmed) return { node: null, commands: [], issues };
  const tokens = tokenize(trimmed, issues);
  const node = parseTokens(tokens, issues);
  return { node, commands: collectCommands(node), issues };
}

// ---------------------------------------------------------------------------
// Evaluation against the semantic event stream
// ---------------------------------------------------------------------------

// Researchers write commands in English ("Flight List") while the prototype's
// accessible names are Turkish ("Uçuş listesi"). Each group lists equivalent
// names for the same UI element; matching succeeds through any of them.
const TARGET_ALIASES: string[][] = [
  ["flight list", "uçuş listesi", "flight board"],
  ["flight search", "uçuş ara"],
  ["passenger search", "yolcu ara"],
  ["seat map", "koltuk haritası"],
  ["previous day", "önceki gün"],
  ["next day", "sonraki gün"],
  ["select all passengers", "tüm yolcuları seç"],
  ["expand row", "satırı genişlet"],
  ["passenger list filter", "yolcu liste filtresi"],
  ["flight status", "uçuş statüsü"],
  ["close popup", "popup kapat"],
  ["back", "geri dön", "geri"],
  ["refresh", "yenile"],
  ["fullscreen", "tam ekran"],
  ["settings", "ayarlar"],
  ["notifications", "bildirimler"],
  ["add bag", "bag artır"],
  ["remove bag", "bag azalt"],
];

const NORMALIZED_ALIASES = TARGET_ALIASES.map((group) => group.map(normalizeLabel));

function aliasesFor(label: string): string[] {
  const normalized = normalizeLabel(label);
  const group = NORMALIZED_ALIASES.find((aliases) => aliases.includes(normalized));
  return group ? [normalized, ...group] : [normalized];
}

export function targetMatches(expected: string, actual: string): boolean {
  const got = normalizeLabel(actual);
  if (!got) return false;
  return aliasesFor(expected).some((want) => want && (got === want || got.includes(want) || want.includes(got)));
}

export function commandMatchesEvent(command: Command, event: SemanticEvent): boolean {
  if (!ACTION_EVENT_TYPES[command.action].includes(event.type)) return false;
  if (command.action === "Type") {
    if (command.text && !normalizeLabel(event.value ?? "").includes(normalizeLabel(command.text))) return false;
    if (command.target && !targetMatches(command.target, event.target)) return false;
    return Boolean(command.text || command.target);
  }
  if (command.text && !normalizeLabel(event.value ?? "").includes(normalizeLabel(command.text))) return false;
  return targetMatches(command.target, event.target);
}

/** True when the condition tree is satisfied by the events observed so far. */
export function evaluateCondition(node: ConditionNode, events: SemanticEvent[]): boolean {
  switch (node.kind) {
    case "cmd": return events.some((event) => commandMatchesEvent(node.command, event));
    case "not": return !evaluateCondition(node.child, events);
    case "and": return node.children.every((child) => evaluateCondition(child, events));
    case "or": return node.children.some((child) => evaluateCondition(child, events));
  }
}

/** Per-command progress for the participant task bar / live board. */
export function commandProgress(commands: Command[], events: SemanticEvent[]): boolean[] {
  return commands.map((command) => events.some((event) => commandMatchesEvent(command, event)));
}

export function formatCommand(command: Command): string {
  const parts: string[] = [command.action];
  if (command.target) parts.push(`[${command.target}]`);
  if (command.text) parts.push(`"${command.text}"`);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Target catalog — discoverable UI elements of each prototype
// ---------------------------------------------------------------------------

export type TargetKind =
  | "Buttons" | "Cards" | "Dropdowns" | "Tabs" | "Lists"
  | "Checkboxes" | "Inputs" | "Dialogs" | "Navigation Items" | "Screens" | "Flights" | "Options";

export interface TargetEntry {
  label: string;
  kind: TargetKind;
}

// Semantic surface of the Passenger Check-in prototype, mirroring its
// accessible names. Dynamic content (flight numbers, seats) is listed by its
// stable identifiers so researchers can reference e.g. Select [TK1815].
const CHECKIN_TARGETS: TargetEntry[] = [
  { label: "Flight List", kind: "Lists" },
  { label: "Uçuş listesi", kind: "Lists" },
  { label: "Uçuş ara", kind: "Inputs" },
  { label: "Önceki gün", kind: "Buttons" },
  { label: "Sonraki gün", kind: "Buttons" },
  { label: "Check-in", kind: "Buttons" },
  { label: "Check-in all", kind: "Buttons" },
  { label: "Yolcu ara", kind: "Inputs" },
  { label: "Tüm yolcuları seç", kind: "Checkboxes" },
  { label: "Satırı genişlet", kind: "Buttons" },
  { label: "Koltuk haritası", kind: "Cards" },
  { label: "Seat Map", kind: "Cards" },
  { label: "Filter", kind: "Buttons" },
  { label: "No Rec", kind: "Buttons" },
  { label: "Offload", kind: "Buttons" },
  { label: "Uçuş statüsü", kind: "Dropdowns" },
  { label: "Geri dön", kind: "Buttons" },
  { label: "Yenile", kind: "Buttons" },
  { label: "Tam ekran", kind: "Buttons" },
  { label: "Ayarlar", kind: "Buttons" },
  { label: "Hızlı arama", kind: "Buttons" },
  { label: "Bildirimler", kind: "Buttons" },
  { label: "Popup kapat", kind: "Dialogs" },
  { label: "Seçimi kapat", kind: "Dialogs" },
  { label: "Payment method", kind: "Dropdowns" },
  { label: "Bag artır", kind: "Buttons" },
  { label: "Bag azalt", kind: "Buttons" },
  { label: "Inbound outbound tabs", kind: "Tabs" },
  { label: "Yolcu liste filtresi", kind: "Dropdowns" },
  ...["TK0618", "TK0706", "TK1032", "TK1037", "TK1126", "TK1727", "TK1785", "TK1806", "TK1815", "TK1827"]
    .map<TargetEntry>((code) => ({ label: code, kind: "Flights" })),
  ...["Flight Board", "Flight Overview", "Flight Info Expanded", "Passenger List", "Seat Map Focus", "Compact Workspace"]
    .map<TargetEntry>((screen) => ({ label: screen, kind: "Screens" })),
];

const TARGETS_BY_PROTOTYPE: Record<string, TargetEntry[]> = {
  "passenger-checkin": CHECKIN_TARGETS,
};

export function getTargetCatalog(prototypeId: string): TargetEntry[] {
  return TARGETS_BY_PROTOTYPE[prototypeId] ?? [];
}

export function isKnownTarget(target: string, catalog: TargetEntry[]): boolean {
  return catalog.some((entry) => targetMatches(entry.label, target) || targetMatches(target, entry.label));
}

export type CommandValidity = "valid" | "unknown-target";

export function validateCommandTarget(command: Command, catalog: TargetEntry[]): CommandValidity {
  if (command.action === "Type" && !command.target) return "valid"; // free text, no target needed
  if (!command.target) return "valid";
  return isKnownTarget(command.target, catalog) ? "valid" : "unknown-target";
}

export type TaskValidationStatus = "empty" | "valid" | "warning" | "error";

/** Overall status shown as the task's Validation Status chip. */
export function scriptValidationStatus(script: string, catalog: TargetEntry[]): TaskValidationStatus {
  const trimmed = script.trim();
  if (!trimmed) return "empty";
  const parsed = parseConditionScript(trimmed);
  if (parsed.issues.length || !parsed.node) return "error";
  const unknown = parsed.commands.some((command) => validateCommandTarget(command, catalog) !== "valid");
  return unknown ? "warning" : "valid";
}
