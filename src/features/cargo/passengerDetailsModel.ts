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

export function getPassengerInfoAlertKey(passengerPnr: string, open: boolean) {
  return `${passengerPnr}:${open ? "open" : "closed"}`;
}
