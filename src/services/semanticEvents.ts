// Semantic event layer for the Smart Task Builder. Interactive components
// inside the prototype announce *meaning* ("ButtonClicked: Check-in") instead
// of raw DOM coordinates, and task validation subscribes to these events —
// never to CSS selectors — so success tracking survives layout changes.
//
// Components can emit explicitly via emitSemanticEvent(). For the existing
// check-in prototype, attachSemanticBridge() derives the same events from the
// accessibility tree (role + accessible name), which is the stable, semantic
// surface of the UI rather than its visual structure.

export type SemanticEventType =
  | "ButtonClicked"
  | "PanelOpened"
  | "OptionSelected"
  | "ItemChosen"
  | "NavigationCompleted"
  | "InputChanged"
  | "TextEntered"
  | "CheckboxChecked"
  | "SwitchToggled"
  | "FormSubmitted"
  | "FlowCompleted"
  | "DropdownOpened"
  | "ScreenShown";

export interface SemanticEvent {
  type: SemanticEventType;
  /** Accessible name of the element or flow, e.g. "Flight List", "TK1923". */
  target: string;
  /** Entered text for TextEntered/InputChanged events. */
  value?: string;
  /** Epoch ms. */
  at: number;
}

export const SEMANTIC_EVENT_NAME = "qcx-semantic";

export function emitSemanticEvent(type: SemanticEventType, target: string, value?: string) {
  window.dispatchEvent(new CustomEvent<SemanticEvent>(SEMANTIC_EVENT_NAME, {
    detail: { type, target: target.trim(), value, at: Date.now() },
  }));
}

export function onSemanticEvent(listener: (event: SemanticEvent) => void): () => void {
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<SemanticEvent>).detail;
    if (detail?.type && detail.target !== undefined) listener(detail);
  };
  window.addEventListener(SEMANTIC_EVENT_NAME, handler);
  return () => window.removeEventListener(SEMANTIC_EVENT_NAME, handler);
}

/** Normalise a label for matching: case/diacritic/whitespace-insensitive. */
export function normalizeLabel(label: string): string {
  return label
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ıöüçşğ ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function accessibleName(start: Element): string {
  const source = start.closest("button, a, [role], input, select, textarea, label, summary, tk-button") ?? start;
  const aria = source.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();
  if (source instanceof HTMLInputElement || source instanceof HTMLSelectElement || source instanceof HTMLTextAreaElement) {
    const labelled = source.labels?.[0]?.textContent ?? source.getAttribute("placeholder") ?? "";
    if (labelled.trim()) return labelled.trim().replace(/\s+/g, " ");
  }
  const text = (source.textContent ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 60);
}

const SELECTION_ROLES = new Set(["option", "tab", "radio", "row", "gridcell", "menuitem", "listitem"]);

function isListItemLike(start: Element): boolean {
  for (let el: Element | null = start, depth = 0; el && depth < 4; el = el.parentElement, depth += 1) {
    if (el.tagName === "LI" || el.tagName === "TR" || el.tagName === "UL" || el.tagName === "OL") return true;
    const role = el.getAttribute("role");
    if (role === "list" || role === "listbox" || role === "listitem" || role === "option" || role === "row") return true;
    const className = typeof el.className === "string" ? el.className : "";
    if (/(^|[\s-])(item|items|row|rows|card|cards|list)([\s-]|$)/.test(className)) return true;
  }
  return false;
}
const OPEN_HINTS = /expand|open|aç|genişlet|arrow_drop|keyboard_arrow/i;

function classifyClick(target: Element): { type: SemanticEventType; element: Element } | null {
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    const role = el.getAttribute("role");
    const tag = el.tagName;
    if (tag === "INPUT") {
      const input = el as HTMLInputElement;
      if (input.type === "checkbox") return { type: "CheckboxChecked", element: el };
      if (input.type === "radio") return { type: "OptionSelected", element: el };
      continue;
    }
    if (role === "switch") return { type: "SwitchToggled", element: el };
    if (role === "checkbox") return { type: "CheckboxChecked", element: el };
    if (role === "combobox" || tag === "SELECT") return { type: "DropdownOpened", element: el };
    if (role && SELECTION_ROLES.has(role)) return { type: "OptionSelected", element: el };
    if (tag === "BUTTON" || tag === "A" || role === "button" || role === "link" || tag.startsWith("TK-") || tag === "SUMMARY") {
      const name = accessibleName(el);
      const type: SemanticEventType = OPEN_HINTS.test(name) || el.getAttribute("aria-expanded") === "false" ? "PanelOpened" : "ButtonClicked";
      return { type, element: el };
    }
  }
  return null;
}

/**
 * Derives semantic events from a mounted prototype root. Attaches
 * capture-phase listeners (clicks, inputs, submits) plus the prototype's own
 * "qcx-screen" navigation announcements. Returns a detach function.
 */
export function attachSemanticBridge(root: HTMLElement): () => void {
  const cleanup: Array<() => void> = [];

  const onClick = (event: Event) => {
    const target = event.target as Element | null;
    if (!target) return;
    const classified = classifyClick(target);
    if (!classified) return;
    const name = accessibleName(classified.element);
    if (!name) return;
    emitSemanticEvent(classified.type, name);
    // A selection is also a choice; a panel opening is also a click. Emit the
    // broader synonym so researcher commands match either verb.
    if (classified.type === "OptionSelected") emitSemanticEvent("ItemChosen", name);
    // Clicking an item inside a list-like container (a flight in the flight
    // list, a row in a table) is semantically a selection even when the DOM
    // node is a plain button — emit the selection synonyms too.
    if (classified.type === "ButtonClicked" && isListItemLike(classified.element)) {
      emitSemanticEvent("OptionSelected", name);
      emitSemanticEvent("ItemChosen", name);
    }
  };
  root.addEventListener("click", onClick, true);
  cleanup.push(() => root.removeEventListener("click", onClick, true));

  const onChange = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target || !("value" in target)) return;
    const input = target as HTMLInputElement;
    const name = accessibleName(input);
    if (input.type === "checkbox") {
      if (input.checked) emitSemanticEvent("CheckboxChecked", name);
      return;
    }
    if (input.tagName === "SELECT") {
      const select = input as unknown as HTMLSelectElement;
      const optionLabel = select.selectedOptions?.[0]?.textContent?.trim() || select.value;
      emitSemanticEvent("OptionSelected", optionLabel);
      emitSemanticEvent("ItemChosen", optionLabel);
      return;
    }
    emitSemanticEvent("InputChanged", name, String(input.value));
    emitSemanticEvent("TextEntered", name, String(input.value));
  };
  root.addEventListener("change", onChange, true);
  cleanup.push(() => root.removeEventListener("change", onChange, true));

  // Live typing (before blur/change) so Type "John" completes as the user types.
  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target || !("value" in target) || target.type === "checkbox") return;
    emitSemanticEvent("TextEntered", accessibleName(target), String(target.value));
  };
  root.addEventListener("input", onInput, true);
  cleanup.push(() => root.removeEventListener("input", onInput, true));

  const onSubmit = (event: Event) => {
    const form = event.target as HTMLFormElement | null;
    if (!form) return;
    emitSemanticEvent("FormSubmitted", form.getAttribute("aria-label") ?? form.getAttribute("name") ?? "Form");
  };
  root.addEventListener("submit", onSubmit, true);
  cleanup.push(() => root.removeEventListener("submit", onSubmit, true));

  const onScreen = (event: Event) => {
    const screen = (event as CustomEvent<{ screen: string }>).detail?.screen;
    if (!screen) return;
    emitSemanticEvent("NavigationCompleted", screen);
    emitSemanticEvent("ScreenShown", screen);
  };
  window.addEventListener("qcx-screen", onScreen);
  cleanup.push(() => window.removeEventListener("qcx-screen", onScreen));

  return () => cleanup.forEach((fn) => fn());
}
