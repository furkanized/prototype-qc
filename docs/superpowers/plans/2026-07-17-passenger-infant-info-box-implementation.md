# Passenger Infant And Info Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Ayşe Ayın an infant linked to Furkan Ayın and render Figma-accurate linked-infant and optional passenger info boxes directly below the customer profile summary.

**Architecture:** Add a small pure TypeScript passenger-details model for relationship lookup and alert metadata, then consume it from the existing `PassengerDetailsDrawer`. Keep the UI in the existing cargo feature file to match the repository's established component pattern, and add narrowly scoped CSS beside the existing passenger-detail styles.

**Tech Stack:** React, TypeScript, Vite, plain CSS, Node.js 24 built-in test runner, Takeoff icon wrapper.

## Global Constraints

- Do not install new dependencies or Tailwind.
- Preserve the current passenger drawer layout, scrolling, Escape/outside-click close behavior, and 260ms slide motion.
- Use QC 2.0 Anasayfa node `2808:101891` for the infant notice.
- Use QC 2.0 Components node `1814:15645` for the four info-box variants.
- Ayşe Ayın remains a passenger record but becomes an infant linked to Furkan Ayın through PNR `A1B2C3`.
- Passengers without infant or info-box data render no placeholder space.

---

### Task 1: Passenger relationship and info-box model

**Files:**
- Create: `src/features/cargo/passengerDetailsModel.ts`
- Create: `src/features/cargo/passengerDetailsModel.test.ts`
- Modify: `src/features/cargo/FlightSearchPage.tsx:354-610`

**Interfaces:**
- Produces: `PassengerType`, `PassengerInfoBoxVariant`, `PassengerInfoBox`, `PassengerRelationshipRecord`, and `findLinkedInfant<T>()`.
- Consumes: Passenger PNR and `linkedAdultPnr` values from the existing passenger data.

- [ ] **Step 1: Write the failing relationship test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { findLinkedInfant } from "./passengerDetailsModel.ts";

test("finds the infant linked to the selected adult", () => {
  const passengers = [
    { pnr: "A1B2C3", passengerType: "adult" as const },
    { pnr: "G7H8I9", passengerType: "infant" as const, linkedAdultPnr: "A1B2C3" },
    { pnr: "D4E5F6", passengerType: "adult" as const },
  ];

  assert.deepEqual(findLinkedInfant(passengers, passengers[0]), passengers[1]);
  assert.equal(findLinkedInfant(passengers, passengers[2]), undefined);
  assert.equal(findLinkedInfant(passengers, passengers[1]), undefined);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
PATH=/Users/932578/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test src/features/cargo/passengerDetailsModel.test.ts
```

Expected: FAIL because `passengerDetailsModel.ts` does not exist.

- [ ] **Step 3: Implement the pure model**

```ts
export type PassengerType = "adult" | "infant";

export type PassengerInfoBoxVariant = "warning" | "warning-actions" | "ai" | "ai-actions";

export type PassengerInfoBox = {
  variant: PassengerInfoBoxVariant;
  title: string;
  description: string;
  actions?: string[];
};

export type PassengerRelationshipRecord = {
  pnr: string;
  passengerType: PassengerType;
  linkedAdultPnr?: string;
};

export function findLinkedInfant<T extends PassengerRelationshipRecord>(passengers: T[], passenger: T) {
  if (passenger.passengerType !== "adult") return undefined;
  return passengers.find((candidate) =>
    candidate.passengerType === "infant" && candidate.linkedAdultPnr === passenger.pnr
  );
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run the Step 2 command.

Expected: one passing test and zero failures.

- [ ] **Step 5: Extend `PassengerRecord` and update deterministic data**

Add the import:

```ts
import {
  findLinkedInfant,
  type PassengerInfoBox,
  type PassengerType,
} from "./passengerDetailsModel";
```

Extend `PassengerRecord`:

```ts
type PassengerRecord = {
  name: string;
  surname: string;
  pnr: string;
  group: string;
  seat: string;
  ci: string;
  avatar: string;
  baggage: BaggageTone;
  baggageInfo: {
    pieces: number;
    kg: number;
    allowanceKg: number;
    paid: boolean;
  };
  apis: string;
  message: number;
  tier: Tier;
  passengerType: PassengerType;
  linkedAdultPnr?: string;
  birthDate?: string;
  infoBox?: PassengerInfoBox;
};

type PassengerSeedRecord = Omit<PassengerRecord, "passengerType"> & {
  passengerType?: PassengerType;
};
```

Type `curatedPassengersByFlight` as `Record<string, PassengerSeedRecord[]>`. Normalize curated rows in `createPassengersForFlight` so existing rows default to adult:

```ts
const curatedSeeds = curatedPassengersByFlight[flight.code as keyof typeof curatedPassengersByFlight] ?? [];
const curated: PassengerRecord[] = curatedSeeds.map((passenger) => ({
  ...passenger,
  passengerType: passenger.passengerType ?? "adult",
}));
```

Set `passengerType: "adult"` in the object returned by `createGeneratedPassenger`, then override Ayşe's TK2070 record with:

```ts
{
  name: "Ayşe",
  surname: "AYIN",
  pnr: "G7H8I9",
  group: "232",
  seat: "INF",
  ci: "pending",
  avatar: "child-girl",
  baggage: "muted",
  baggageInfo: { pieces: 0, kg: 0, allowanceKg: 0, paid: true },
  apis: "filled",
  message: 0,
  tier: "Classic",
  passengerType: "infant",
  linkedAdultPnr: "A1B2C3",
  birthDate: "04.06.2025",
}
```

Add deterministic info-box records:

```ts
// Furkan
infoBox: {
  variant: "ai-actions",
  title: "Passenger Insights",
  description: "Frequent traveler who prefers an aisle seat and usually completes check-in early.",
  actions: ["Profili Görüntüle", "Not Ekle"],
}

// Nesibe
infoBox: {
  variant: "warning-actions",
  title: "Yolcunun Bagaj Ödemesi Yapılmamış!",
  description: "Yolcunun işlemlerini tamamlamadan önce bagaj ödemesini tamamlayınız.",
  actions: ["Bagajı Görüntüle", "Ödeme Al"],
}

// Ozan
infoBox: {
  variant: "ai",
  title: "Passenger Insights",
  description: "Passenger regularly travels with checked baggage and prefers early boarding.",
}
```

Give one unpaid-overweight curated passenger outside TK2070 the non-action `warning` variant. In `createGeneratedPassenger`, set `passengerType: "adult"` and leave `infoBox` undefined so generated records remain stable and uncluttered.

Use Bora Arslan in TK0706 for that fourth variant:

```ts
infoBox: {
  variant: "warning",
  title: "Yolcunun Bagaj Ödemesi Yapılmamış!",
  description: "Yolcunun işlemlerini tamamlamadan önce bagaj ödemesini tamamlayınız.",
}
```

- [ ] **Step 6: Build and commit the model/data change**

Run:

```bash
PATH=/Users/932578/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/932578/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH pnpm run build
```

Expected: Vite build succeeds; the existing chunk-size warning is acceptable.

Commit:

```bash
git add src/features/cargo/passengerDetailsModel.ts src/features/cargo/passengerDetailsModel.test.ts src/features/cargo/FlightSearchPage.tsx
git commit -m "feat: model linked infant passenger data"
```

---

### Task 2: Figma linked-infant notice

**Files:**
- Modify: `src/features/cargo/FlightSearchPage.tsx:3085-3210`
- Modify: `src/styles.css:125-210`

**Interfaces:**
- Consumes: `findLinkedInfant(passengers, passenger)` and the extended `PassengerRecord`.
- Produces: `PassengerInfantNotice({ infant })` and `.passenger-infant-notice`.

- [ ] **Step 1: Verify the missing UI state (RED)**

Open Furkan Ayın's passenger details and evaluate:

```js
const infantCount = await tab.playwright.locator('.passenger-infant-notice').count();
if (infantCount !== 1) throw new Error(`Expected infant notice, received ${infantCount}`);
```

Expected before implementation: error with `received 0`.

- [ ] **Step 2: Add the infant notice component**

```tsx
function PassengerInfantNotice({ infant }: { infant: Passenger }) {
  return (
    <section className="passenger-infant-notice" aria-label={`Bağlı bebek ${passengerFullName(infant)}`}>
      <span className="passenger-infant-sign"><Icon icon="child_friendly" size={20} /></span>
      <div>
        <p><strong>Bebek,</strong> {passengerFullName(infant)}</p>
        <small>Doğum Tarihi: {infant.birthDate}</small>
      </div>
      <button type="button" aria-label={`${passengerFullName(infant)} bebek bilgisini düzenle`}>
        <Icon icon="edit" size={20} />
      </button>
    </section>
  );
}
```

Change the drawer signature and lookup:

```tsx
function PassengerDetailsDrawer({ passenger, passengers, open, onClose }: {
  passenger: Passenger;
  passengers: Passenger[];
  open: boolean;
  onClose: () => void;
}) {
  const linkedInfant = findLinkedInfant(passengers, passenger);
```

Render immediately after `.passenger-details-summary`:

```tsx
{linkedInfant && <PassengerInfantNotice infant={linkedInfant} />}
```

Pass `passengers={passengers}` from `PassengerTable`.

- [ ] **Step 3: Add the Figma styling**

```css
.passenger-infant-notice{min-height:64px;display:grid;grid-template-columns:32px minmax(0,1fr) 32px;align-items:center;gap:8px;padding:12px;border:1px solid #ffb366;border-radius:8px;background:#fff1e3;color:#994d00}
.passenger-infant-sign{width:32px;height:32px;display:grid;place-items:center;border:1px solid #ffb366;border-radius:8px;background:#f9fafc;color:#f97316}
.passenger-infant-notice>div{min-width:0;display:grid;gap:0}
.passenger-infant-notice p,.passenger-infant-notice small{margin:0;font-size:14px;line-height:20px;font-weight:300}
.passenger-infant-notice p strong{color:#f97316;font-weight:400}
.passenger-infant-notice>button{width:32px;height:32px;display:grid;place-items:center;border:0;border-radius:8px;background:transparent;color:#c35f00;padding:0}
```

- [ ] **Step 4: Verify GREEN in the browser**

Repeat the Step 1 assertion, then verify:

```js
const noticeText = await tab.playwright.locator('.passenger-infant-notice').textContent();
if (!noticeText.includes('Bebek, Ayşe AYIN') || !noticeText.includes('04.06.2025')) {
  throw new Error(noticeText);
}
```

Open Ayşe and an unrelated passenger; both must have `.passenger-infant-notice` count `0`. Confirm Ayşe's details show `Passenger Type` value `Infant` and seat `INF`.

- [ ] **Step 5: Commit the infant UI**

```bash
git add src/features/cargo/FlightSearchPage.tsx src/styles.css
git commit -m "feat: show linked infant in passenger details"
```

---

### Task 3: Warning and AI info-box variants

**Files:**
- Modify: `src/features/cargo/FlightSearchPage.tsx:3085-3210`
- Modify: `src/styles.css:125-220`

**Interfaces:**
- Consumes: `PassengerInfoBox` from `passengerDetailsModel.ts`.
- Produces: `PassengerInfoAlert({ infoBox, onDismiss })` and `.passenger-info-alert` variants.

- [ ] **Step 1: Verify the missing info box (RED)**

Open Furkan's details and evaluate:

```js
const alertCount = await tab.playwright.locator('.passenger-info-alert').count();
if (alertCount !== 1) throw new Error(`Expected info alert, received ${alertCount}`);
```

Expected before implementation: error with `received 0`.

- [ ] **Step 2: Implement the reusable alert**

```tsx
function PassengerInfoAlert({ infoBox, onDismiss }: {
  infoBox: PassengerInfoBox;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAi = infoBox.variant.startsWith("ai");
  const hasActions = infoBox.variant.endsWith("actions");

  return (
    <section className={`passenger-info-alert ${isAi ? "ai" : "warning"} ${hasActions ? "with-actions" : ""}`.trim()}>
      <span className="passenger-info-alert-sign">
        <Icon icon={isAi ? "auto_awesome" : "warning"} size={20} />
      </span>
      <div className="passenger-info-alert-content">
        <div className="passenger-info-alert-title">
          <strong>{infoBox.title}</strong>
          {isAi && <em>AI Summary</em>}
        </div>
        <p className={expanded ? "expanded" : ""}>{infoBox.description}</p>
        {isAi && (
          <button type="button" className="passenger-info-disclosure" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show less" : "Show more"}
            <Icon icon="expand_more" size={18} />
          </button>
        )}
        {hasActions && infoBox.actions?.length ? (
          <div className="passenger-info-actions">
            {infoBox.actions.map((action) => <button type="button" key={action}>{action}</button>)}
          </div>
        ) : null}
      </div>
      {isAi && (
        <button type="button" className="passenger-info-close" aria-label="Bilgi kutusunu kapat" onClick={onDismiss}>
          <Icon icon="close" size={20} />
        </button>
      )}
    </section>
  );
}
```

In `PassengerDetailsDrawer`, add `dismissedInfo` state, reset it when `passenger` or `open` changes, and render after the infant notice:

```tsx
const [dismissedInfo, setDismissedInfo] = useState(false);

useEffect(() => {
  if (open) setDismissedInfo(false);
}, [open, passenger]);

{passenger.infoBox && !dismissedInfo && (
  <PassengerInfoAlert infoBox={passenger.infoBox} onDismiss={() => setDismissedInfo(true)} />
)}
```

- [ ] **Step 3: Add all Figma variant styles**

```css
.passenger-info-alert{display:grid;grid-template-columns:32px minmax(0,1fr) auto;align-items:start;gap:8px;padding:12px;border:1px solid;border-radius:8px}
.passenger-info-alert.warning{border-color:#f6de95;background:#fefbf3}
.passenger-info-alert.ai{border-color:#dab6fc;background:#fbf7ff}
.passenger-info-alert-sign{width:32px;height:32px;display:grid;place-items:center;border:1px solid;border-radius:8px;background:#f9fafc}
.passenger-info-alert.warning .passenger-info-alert-sign{border-color:#f6de95;color:#a47d06}
.passenger-info-alert.ai .passenger-info-alert-sign{border-color:#dab6fc;color:#763cad}
.passenger-info-alert-content{min-width:0;display:grid;gap:8px}
.passenger-info-alert-title{display:flex;align-items:center;gap:8px}
.passenger-info-alert-title strong{color:#222530;font-size:14px;line-height:20px;font-weight:400}
.passenger-info-alert-title em{height:16px;padding:0 6px;border-radius:999px;background:#ead6fd;color:#5c2f88;font-size:11px;line-height:16px;font-style:normal}
.passenger-info-alert-content p{margin:0;color:#525866;font-size:14px;line-height:20px;font-weight:300}
.passenger-info-alert.ai .passenger-info-alert-content p:not(.expanded){display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden}
.passenger-info-disclosure,.passenger-info-actions button,.passenger-info-close{border:0;background:transparent;padding:0}
.passenger-info-disclosure{width:max-content;display:flex;align-items:center;gap:4px;color:#295bac;font-size:12px;line-height:18px}
.passenger-info-disclosure[aria-expanded="true"] .qc-icon{transform:rotate(180deg)}
.passenger-info-actions{display:flex;align-items:center;gap:12px}
.passenger-info-actions button{color:#a47d06;font-size:14px;line-height:20px}
.passenger-info-alert.ai .passenger-info-actions button{color:#763cad}
.passenger-info-close{width:32px;height:32px;display:grid;place-items:center;border-radius:8px;color:#525866}
```

- [ ] **Step 4: Verify all variants and interactions (GREEN)**

Use the browser to open the configured passengers and check:

```js
const alert = tab.playwright.locator('.passenger-info-alert');
if (await alert.count() !== 1) throw new Error('Info alert missing');
```

For Furkan, click `.passenger-info-disclosure`, verify `aria-expanded="true"`, then click `.passenger-info-close` and verify the alert count becomes `0`. Close and reopen Furkan; verify the alert count returns to `1`. Open Nesibe and verify `.passenger-info-alert.warning.with-actions`; open Ozan and verify `.passenger-info-alert.ai:not(.with-actions)`.

- [ ] **Step 5: Commit the info boxes**

```bash
git add src/features/cargo/FlightSearchPage.tsx src/styles.css
git commit -m "feat: add passenger detail info boxes"
```

---

### Task 4: Responsive and regression verification

**Files:**
- Modify: `src/styles.css:190-210`

**Interfaces:**
- Consumes: completed infant and info-box components.
- Produces: verified responsive drawer without regressions.

- [ ] **Step 1: Run automated tests and production build**

```bash
PATH=/Users/932578/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test src/features/cargo/passengerDetailsModel.test.ts
PATH=/Users/932578/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/932578/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH pnpm run build
```

Expected: all model tests pass and Vite builds successfully.

- [ ] **Step 2: Verify desktop behavior in the local browser**

At the current viewport, verify the drawer remains inset, blurred, scrollable, and animated. Open Furkan, Ayşe, Nesibe, Ozan, and one passenger without `infoBox`; verify the data-dependent content described in Tasks 2 and 3.

- [ ] **Step 3: Verify narrow layout**

Add the narrow-layout rules, then confirm at a viewport no wider than 600px that infant and info-box grids do not overflow:

```css
@media (max-width:600px){
  .passenger-infant-notice,.passenger-info-alert{grid-template-columns:32px minmax(0,1fr)}
  .passenger-infant-notice>button,.passenger-info-close{grid-column:2;justify-self:end}
  .passenger-info-alert-title{align-items:flex-start;flex-wrap:wrap}
  .passenger-info-actions{align-items:flex-start;flex-direction:column;gap:6px}
}
```

- [ ] **Step 4: Check browser errors and final diff**

Confirm browser error logs are empty. Review `git diff --check` and ensure no unrelated files were changed.

- [ ] **Step 5: Commit responsive rules**

```bash
git add src/styles.css
git commit -m "fix: keep passenger detail notices responsive"
```
