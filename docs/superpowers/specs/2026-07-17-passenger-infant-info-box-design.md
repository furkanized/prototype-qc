# Passenger Infant And Info Box Design

## Scope

Extend the existing passenger details drawer with two Figma-defined elements directly below the customer profile summary:

- A linked infant passenger strip based on QC 2.0 Anasayfa node `2808:101891`.
- Optional passenger alert and insight boxes based on QC 2.0 Components node `1814:15645`.

The existing drawer layout, slide motion, identity/contact sections, validations, accordions, and close behavior remain unchanged.

## Passenger Data Model

The passenger record gains explicit relationship and presentation fields instead of inferring special behavior from names:

```ts
type PassengerType = "adult" | "infant";

type PassengerInfoBox = {
  variant: "warning" | "warning-actions" | "ai" | "ai-actions";
  title: string;
  description: string;
  actions?: string[];
};

type PassengerRecord = {
  // Existing fields remain.
  passengerType: PassengerType;
  linkedAdultPnr?: string;
  birthDate?: string;
  infoBox?: PassengerInfoBox;
};
```

Adult passengers may have one linked infant. Infant passengers must reference an existing adult through `linkedAdultPnr`. Info boxes are optional and data-driven.

## Furkan And Ayşe Relationship

- Furkan Ayın remains an adult passenger with PNR `A1B2C3`.
- Ayşe Ayın becomes an infant linked to Furkan through `linkedAdultPnr: "A1B2C3"`.
- Ayşe remains visible in the passenger list as a distinct passenger record.
- Ayşe uses a child-girl avatar, passenger type `Infant`, seat value `INF`, and infant-compatible baggage data.
- Opening Furkan's details shows an amber infant strip immediately below the customer profile summary.
- The strip reads `Bebek, Ayşe Ayın` and displays Ayşe's birth date.
- The strip includes the Figma edit icon button as a visual action.
- Opening an unrelated adult does not show Ayşe's infant strip.
- Opening Ayşe's own details identifies her as an infant and does not recursively render another linked-infant strip.

## Infant Strip Component

Create a reusable `PassengerInfantNotice` component with the following contract:

```ts
type PassengerInfantNoticeProps = {
  infant: Passenger;
};
```

Visual requirements from Figma:

- Full-width row below the profile summary.
- Amber-light background and amber border.
- 8px radius and 12px internal padding.
- `child_friendly` icon in a bordered 32px sign container.
- Two text lines using 14/20 typography.
- Edit icon button aligned to the trailing edge.
- Responsive wrapping without clipping the passenger name or birth date.

## Info Box Component

Create a reusable `PassengerInfoAlert` component supporting the four Figma variants:

- `warning`: warning styling without actions.
- `warning-actions`: warning styling with action links.
- `ai`: purple AI insight styling, expandable text, and close action.
- `ai-actions`: compact purple AI insight styling with action links and close action.

All variants render immediately below the linked infant strip when both are present, or immediately below the customer profile summary when no infant is linked.

The warning variants use the warning icon, amber border/background, dark title, and secondary description. The AI variants use the `auto_awesome` icon, purple border/background, `AI Summary` badge, and Show more/Show less disclosure behavior. Actions are rendered only when supplied in passenger data.

## Data Distribution

Info boxes are deterministic and tied to passenger records:

- Passengers with unpaid overweight baggage receive a warning variant describing the unpaid baggage requirement.
- A small fixed subset of passengers receive an AI insight variant generated from their existing profile data.
- The dashboard includes at least one deterministic passenger record for each of the four Figma variants.
- Passengers without `infoBox` render no empty space or placeholder.

## Interaction And Accessibility

- Infant edit and info-box action controls use semantic buttons.
- AI Show more/Show less updates `aria-expanded` and expands only its own content.
- AI close removes the box for the current drawer session; reopening the passenger restores the data-defined box.
- The existing drawer scroll container owns all additional content.
- New content does not alter drawer opening/closing motion.
- Focus-visible styles follow the existing Takeoff blue focus treatment.

## Testing

Automated or browser-level checks cover:

1. Furkan's details show the linked Ayşe infant strip.
2. Ayşe is rendered as an infant with child avatar, `INF` seat, and infant passenger type.
3. Unrelated passengers do not show the infant strip.
4. Passengers with configured info boxes render the correct warning or AI variant.
5. AI Show more/Show less toggles its content and accessible state.
6. Closing an AI box hides it for the current drawer session.
7. Drawer scrolling, outside click, Escape, and slide motion continue to work.
8. Desktop and narrow layouts do not clip infant or info-box content.

## Out Of Scope

- Persisting infant edits or dismissed alerts to a backend.
- Creating an infant edit form.
- Generating AI text from a live service.
- Changing the passenger table columns or the existing check-in workflow.
