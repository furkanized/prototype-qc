import assert from "node:assert/strict";
import test from "node:test";
import { findLinkedInfant, getPassengerInfoAlertKey } from "./passengerDetailsModel.ts";

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
