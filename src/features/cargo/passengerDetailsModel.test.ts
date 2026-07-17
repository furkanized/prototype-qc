import assert from "node:assert/strict";
import test from "node:test";
import { findLinkedInfant, getPassengerInfoAlertKey, isInfantBirthDateValid } from "./passengerDetailsModel.ts";

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

test("changes the passenger info alert key for every drawer session", () => {
  assert.notEqual(
    getPassengerInfoAlertKey("A1B2C3", 1),
    getPassengerInfoAlertKey("A1B2C3", 2),
  );
  assert.notEqual(
    getPassengerInfoAlertKey("A1B2C3", 2),
    getPassengerInfoAlertKey("G7H8I9", 2),
  );
});

test("accepts only valid birth dates within the infant age range", () => {
  const today = new Date(2026, 6, 17);

  assert.equal(isInfantBirthDateValid("04.06.2025", today), true);
  assert.equal(isInfantBirthDateValid("17/07/2024", today), true);
  assert.equal(isInfantBirthDateValid("16/07/2024", today), false);
  assert.equal(isInfantBirthDateValid("18/07/2026", today), false);
  assert.equal(isInfantBirthDateValid("31/02/2026", today), false);
});
