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

export function getPassengerInfoAlertKey(passengerPnr: string, sessionId: number) {
  return `${passengerPnr}:${sessionId}`;
}

function parsePassengerDate(value: string) {
  const match = value.trim().match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!match) return undefined;

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

export function isInfantBirthDateValid(value: string, today = new Date()) {
  const birthDate = parsePassengerDate(value);
  if (!birthDate) return false;

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const oldestInfantDate = new Date(startOfToday);
  oldestInfantDate.setFullYear(oldestInfantDate.getFullYear() - 2);

  return birthDate <= startOfToday && birthDate >= oldestInfantDate;
}
