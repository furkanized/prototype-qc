import type { LiveParticipantStatus, TestInvite, TestSession, UsabilityTest } from "../types/testing";
import { getTests, makeId, saveTest } from "./testingService";
import { readStore, writeStore } from "./storage";

const INVITES_KEY = "uts-invites";
const LIVE_CHANNEL = "qcx-uts-live";
const DEFAULT_EXPIRY_DAYS = 7;

/* --------------------------------------------------------------------------
   Invites — shareable /test/<code> links
   -------------------------------------------------------------------------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function generateCode(existing: Set<string>): string {
  for (;;) {
    let code = "";
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    bytes.forEach((byte) => { code += CODE_ALPHABET[byte % CODE_ALPHABET.length]; });
    if (!existing.has(code)) return code;
  }
}

export function getInvites(testId?: string): TestInvite[] {
  const invites = readStore<TestInvite[]>(INVITES_KEY, []);
  return testId ? invites.filter((invite) => invite.testId === testId) : invites;
}

function saveInvites(invites: TestInvite[]) {
  writeStore(INVITES_KEY, invites);
}

export function createInvite(testId: string, expiryDays = DEFAULT_EXPIRY_DAYS): TestInvite {
  const invites = getInvites();
  const invite: TestInvite = {
    id: makeId("invite"),
    code: generateCode(new Set(invites.map((entry) => entry.code))),
    testId,
    participantId: `P-${String(invites.filter((entry) => entry.testId === testId).length + 1).padStart(3, "0")}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryDays * 86400000).toISOString(),
    disabled: false,
  };
  saveInvites([invite, ...invites]);
  return invite;
}

export function updateInvite(inviteId: string, patch: Partial<TestInvite>): TestInvite | undefined {
  const invites = getInvites();
  const index = invites.findIndex((invite) => invite.id === inviteId);
  if (index === -1) return undefined;
  invites[index] = { ...invites[index], ...patch };
  saveInvites(invites);
  return invites[index];
}

// Regenerate keeps the invite slot but mints a fresh code (old link dies).
export function regenerateInvite(inviteId: string): TestInvite | undefined {
  const code = generateCode(new Set(getInvites().map((entry) => entry.code)));
  return updateInvite(inviteId, { code, disabled: false, expiresAt: new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 86400000).toISOString() });
}

export function findInviteByCode(code: string): TestInvite | undefined {
  return getInvites().find((invite) => invite.code.toUpperCase() === code.toUpperCase());
}

export function inviteState(invite: TestInvite): "active" | "disabled" | "expired" | "completed" {
  if (invite.usedBySessionId) return "completed";
  if (invite.disabled) return "disabled";
  if (Date.parse(invite.expiresAt) < Date.now()) return "expired";
  return "active";
}

// Unicode-safe, URL-safe base64 for embedding JSON payloads in links.
function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string {
  const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Tests and invites live in the researcher's localStorage, so a bare
// /test/<code> link is meaningless on someone else's device. The link
// therefore carries the full test definition + invite as a payload the
// participant page adopts on first open — no backend required.
interface SharePayload {
  invite: TestInvite;
  test: UsabilityTest;
}

export function inviteUrl(invite: TestInvite, test?: UsabilityTest): string {
  const base = `${window.location.origin}/#/test/${invite.code}`;
  const fullTest = test ?? getTests().find((candidate) => candidate.id === invite.testId);
  if (!fullTest) return base;
  const payload: SharePayload = { invite, test: fullTest };
  return `${base}?p=${toBase64Url(JSON.stringify(payload))}`;
}

// If the URL carries a share payload for an invite we don't know locally,
// store the test and invite so the participant flow can run on this device.
export function adoptInviteFromLocation(code: string): boolean {
  const match = (window.location.hash + window.location.search).match(/[?&]p=([A-Za-z0-9_-]+)/);
  if (!match) return false;
  try {
    const payload = JSON.parse(fromBase64Url(match[1])) as SharePayload;
    if (!payload.invite || !payload.test || payload.invite.code.toUpperCase() !== code.toUpperCase()) return false;
    if (!getTests().some((test) => test.id === payload.test.id)) saveTest(payload.test);
    const invites = getInvites();
    if (!invites.some((invite) => invite.code.toUpperCase() === payload.invite.code.toUpperCase())) {
      saveInvites([payload.invite, ...invites]);
    }
    return true;
  } catch {
    return false;
  }
}

// Accepts both /#/test/CODE and /test/CODE forms.
export function inviteCodeFromLocation(): string | null {
  const hash = window.location.hash.match(/#\/?test\/([A-Za-z0-9]+)/);
  if (hash) return hash[1];
  const path = window.location.pathname.match(/\/test\/([A-Za-z0-9]+)/);
  return path ? path[1] : null;
}

/* --------------------------------------------------------------------------
   Result codes — returning a completed session to the researcher.
   Without a backend, a session recorded on the participant's device cannot
   reach the researcher's browser. The completion screen offers a compact
   result code the participant sends back; the studio imports it.
   -------------------------------------------------------------------------- */

export function encodeSessionResult(session: TestSession): string {
  return toBase64Url(JSON.stringify(session));
}

export function decodeSessionResult(code: string): TestSession | null {
  try {
    const session = JSON.parse(fromBase64Url(code.trim())) as TestSession;
    if (!session.id || !session.testId || !Array.isArray(session.events)) return null;
    return session;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   Live channel — realtime participant presence across tabs.
   BroadcastChannel today; the message shapes are what a websocket backend
   would carry later.
   -------------------------------------------------------------------------- */

type LiveMessage =
  | { type: "presence"; status: LiveParticipantStatus }
  | { type: "session-saved"; testId: string; sessionId: string };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(LIVE_CHANNEL);
  return channel;
}

export function publishPresence(status: LiveParticipantStatus) {
  getChannel()?.postMessage({ type: "presence", status } satisfies LiveMessage);
}

export function publishSessionSaved(testId: string, sessionId: string) {
  getChannel()?.postMessage({ type: "session-saved", testId, sessionId } satisfies LiveMessage);
}

export function subscribeLive(handlers: {
  onPresence?: (status: LiveParticipantStatus) => void;
  onSessionSaved?: (testId: string, sessionId: string) => void;
}): () => void {
  const bc = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(LIVE_CHANNEL);
  if (!bc) return () => {};
  bc.onmessage = (event: MessageEvent<LiveMessage>) => {
    const message = event.data;
    if (message.type === "presence") handlers.onPresence?.(message.status);
    if (message.type === "session-saved") handlers.onSessionSaved?.(message.testId, message.sessionId);
  };
  return () => bc.close();
}

// A participant is considered connected while heartbeats are fresher than this.
export const PRESENCE_TIMEOUT_MS = 7000;
