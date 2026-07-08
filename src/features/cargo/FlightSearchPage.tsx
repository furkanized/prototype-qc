import { Fragment, createElement, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { TkDatepicker } from "@takeoff-ui/react";
import { defineCustomElement as defineTkIcon } from "@takeoff-ui/core/components/tk-icon.js";
import { defineCustomElement as defineTkButton } from "@takeoff-ui/core/components/tk-button.js";
import { defineCustomElement as defineTkInput } from "@takeoff-ui/core/components/tk-input.js";
import { defineCustomElement as defineTkCheckbox } from "@takeoff-ui/core/components/tk-checkbox.js";
import { defineCustomElement as defineTkSpinner } from "@takeoff-ui/core/components/tk-spinner.js";
import { defineCustomElement as defineTkTabs } from "@takeoff-ui/core/components/tk-tabs.js";
import { defineCustomElement as defineTkTabsItem } from "@takeoff-ui/core/components/tk-tabs-item.js";
import { defineCustomElement as defineTkTooltip } from "@takeoff-ui/core/components/tk-tooltip.js";
import qcMark from "../../assets/qc-mark.svg";
import qcText from "../../assets/qc-text.svg";

defineTkIcon();
defineTkButton();
defineTkInput();
defineTkCheckbox();
defineTkSpinner();
defineTkTabs();
defineTkTabsItem();
defineTkTooltip();

const FLIGHT_SIDEBAR_OVERDRAW = 18;

function getFlightSidebarWidthValue() {
  if (typeof window === "undefined") return 203;
  const rawWidth = window.getComputedStyle(document.documentElement).getPropertyValue("--flight-sidebar-width").trim();
  const parsedWidth = Number.parseFloat(rawWidth);
  return Number.isFinite(parsedWidth) ? parsedWidth : 203;
}

function useAnimatedPresence(open: boolean, duration = 220) {
  const [isMounted, setIsMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      return;
    }

    const timeout = window.setTimeout(() => setIsMounted(false), duration);
    return () => window.clearTimeout(timeout);
  }, [duration, open]);

  return { isMounted, isVisible: open };
}

function Icon({
  icon,
  size = 20,
  fill = false,
  className = "",
  sign = false,
  variant,
}: {
  icon: string;
  size?: number | "xxlarge" | "xlarge" | "large" | "medium" | "base" | "small" | "xsmall" | "xxsmall";
  fill?: boolean;
  className?: string;
  sign?: boolean;
  variant?: "primary" | "secondary" | "neutral" | "info" | "success" | "danger" | "warning" | "white";
}) {
  const sizeMap: Record<string, number> = {
    xxlarge: 40,
    xlarge: 32,
    large: 28,
    medium: 24,
    base: 20,
    small: 18,
    xsmall: 16,
    xxsmall: 14,
  };
  const resolvedSize = typeof size === "number" ? size : sizeMap[size] ?? 20;
  const resolvedClassName = [
    "qc-icon",
    sign ? "sign" : "",
    variant ? `variant-${variant}` : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <span
      className={resolvedClassName}
      aria-hidden="true"
      style={{
        fontSize: `${resolvedSize}px`,
        fontVariationSettings: fill ? "\"FILL\" 1, \"wght\" 400, \"GRAD\" 0, \"opsz\" 24" : "\"FILL\" 0, \"wght\" 400, \"GRAD\" 0, \"opsz\" 24",
      }}
    >
      {icon}
    </span>
  );
}


type TkButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "neutral" | "info" | "success" | "danger" | "warning" | "white" | "black";
  type?: "filled" | "filledLight" | "outlined" | "text";
  size?: "small" | "base" | "large";
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

function TkButton({ label, variant = "primary", type = "filled", size = "base", icon, iconPosition = "left", fullWidth = false, disabled = false, className = "", onClick }: TkButtonProps) {
  const buttonRef = useRef<HTMLElement | null>(null);
  const lastClickAt = useRef(0);

  const triggerClick = () => {
    const now = Date.now();
    if (now - lastClickAt.current < 80) return;
    lastClickAt.current = now;
    onClick?.();
  };

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !onClick) return;
    button.addEventListener("tk-click", triggerClick);
    return () => button.removeEventListener("tk-click", triggerClick);
  }, [onClick]);

  return createElement("tk-button", {
    ref: buttonRef,
    label,
    variant,
    type,
    size,
    icon,
    iconPosition,
    fullWidth,
    disabled,
    className,
    onClick: triggerClick,
  });
}

function TkInput({ label, placeholder, value, readonly = false, icon, iconPosition = "left", showAsterisk = false, className = "", ariaLabel }: { label: string; placeholder?: string; value?: string; readonly?: boolean; icon?: string; iconPosition?: "left" | "right"; showAsterisk?: boolean; className?: string; ariaLabel?: string }) {
  return createElement("tk-input", {
    label,
    placeholder,
    value,
    readonly,
    icon,
    iconPosition,
    showAsterisk,
    size: "base",
    className,
    "aria-label": ariaLabel ?? label,
  });
}

function TkCheckboxMark({ checked, label }: { checked: boolean; label: string }) {
  return createElement("tk-checkbox", {
    checked,
    label,
    size: "base",
    className: "payment-tk-checkbox",
    "aria-label": label,
  });
}

function TkSpinner({ label = "Processing" }: { label?: string }) {
  return createElement("tk-spinner", {
    label,
    size: "large",
    type: "rounded",
    variant: "info",
    orientation: "vertical",
    className: "payment-tk-spinner",
  });
}

function CheckboxMark({ checked, mixed = false }: { checked: boolean; mixed?: boolean }) {
  const className = `checkbox ${checked ? "checked" : ""} ${mixed ? "mixed" : ""}`.trim();
  return (
    <span className={className}>
      {checked ? (
        <span className="checkbox-core">
          <Icon icon="check" size={12} fill />
        </span>
      ) : mixed ? (
        <span className="checkbox-core mixed">
          <span />
        </span>
      ) : null}
    </span>
  );
}

function FlightRoute({ route, className = "" }: { route: string; className?: string }) {
  const [from = "", to = ""] = route.split("›").map((part) => part.trim());
  return (
    <span className={`flight-route ${className}`.trim()}>
      <span>{from}</span>
      <Icon icon="flight" size={18} fill className="route-plane" />
      <span>{to}</span>
    </span>
  );
}

function BaggageNotificationIcon({ tone }: { tone: BaggageTone }) {
  const color = tone === "muted" ? "#C9DCFA" : "#3B82F6";

  return (
    <span className={`notification-icon baggage-notification ${tone}`} aria-hidden="true">
      <svg viewBox="0 0 11.67 16.67" width="11.67" height="16.67" xmlns="http://www.w3.org/2000/svg" className="notification-icon-main">
        <path d="M10.000 3.333C10.000 3.333 8.333 3.333 8.333 3.333C8.333 3.333 8.333 0.833 8.333 0.833C8.333 0.375 7.958 0.000 7.500 0.000C7.500 0.000 4.167 0.000 4.167 0.000C3.708 0.000 3.333 0.375 3.333 0.833C3.333 0.833 3.333 3.333 3.333 3.333C3.333 3.333 1.667 3.333 1.667 3.333C0.750 3.333 0.000 4.083 0.000 5.000C0.000 5.000 0.000 14.167 0.000 14.167C0.000 15.083 0.750 15.833 1.667 15.833C1.667 16.292 2.042 16.667 2.500 16.667C2.958 16.667 3.333 16.292 3.333 15.833C3.333 15.833 8.333 15.833 8.333 15.833C8.333 16.292 8.708 16.667 9.167 16.667C9.625 16.667 10.000 16.292 10.000 15.833C10.917 15.833 11.667 15.083 11.667 14.167C11.667 14.167 11.667 5.000 11.667 5.000C11.667 4.083 10.917 3.333 10.000 3.333ZM3.125 13.333C2.783 13.333 2.500 13.050 2.500 12.708C2.500 12.708 2.500 6.458 2.500 6.458C2.500 6.117 2.783 5.833 3.125 5.833C3.467 5.833 3.750 6.117 3.750 6.458C3.750 6.458 3.750 12.708 3.750 12.708C3.750 13.050 3.467 13.333 3.125 13.333ZM5.833 13.333C5.492 13.333 5.208 13.050 5.208 12.708C5.208 12.708 5.208 6.458 5.208 6.458C5.208 6.117 5.492 5.833 5.833 5.833C6.175 5.833 6.458 6.117 6.458 6.458C6.458 6.458 6.458 12.708 6.458 12.708C6.458 13.050 6.175 13.333 5.833 13.333ZM7.083 3.333C7.083 3.333 4.583 3.333 4.583 3.333C4.583 3.333 4.583 1.250 4.583 1.250C4.583 1.250 7.083 1.250 7.083 1.250C7.083 1.250 7.083 3.333 7.083 3.333ZM8.542 13.333C8.200 13.333 7.917 13.050 7.917 12.708C7.917 12.708 7.917 6.458 7.917 6.458C7.917 6.117 8.200 5.833 8.542 5.833C8.883 5.833 9.167 6.117 9.167 6.458C9.167 6.458 9.167 12.708 9.167 12.708C9.167 13.050 8.883 13.333 8.542 13.333Z" fillRule="nonzero" fill={color} />
      </svg>
      {tone === "alert" && (
        <span className="notification-badge badge-baggage">
          <svg viewBox="0 0.126 8.034 8.034" width="8" height="8" xmlns="http://www.w3.org/2000/svg">
            <path transform="translate(1.33 0.56)" d="M2.307 3.583C2.307 3.583 2.667 3.310 2.667 3.310C2.667 3.310 3.023 3.580 3.023 3.580C3.153 3.677 3.330 3.553 3.283 3.397C3.283 3.397 3.143 2.943 3.143 2.943C3.143 2.943 3.543 2.627 3.543 2.627C3.667 2.533 3.597 2.333 3.437 2.333C3.437 2.333 2.970 2.333 2.970 2.333C2.970 2.333 2.827 1.887 2.827 1.887C2.777 1.733 2.560 1.733 2.510 1.887C2.510 1.887 2.363 2.333 2.363 2.333C2.363 2.333 1.893 2.333 1.893 2.333C1.737 2.333 1.667 2.533 1.790 2.630C1.790 2.630 2.187 2.947 2.187 2.947C2.187 2.947 2.047 3.400 2.047 3.400C2.000 3.557 2.177 3.680 2.307 3.583ZM0.667 6.537C0.667 6.763 0.890 6.923 1.107 6.853C1.107 6.853 2.667 6.333 2.667 6.333C2.667 6.333 4.227 6.853 4.227 6.853C4.443 6.927 4.667 6.767 4.667 6.537C4.667 6.537 4.667 4.427 4.667 4.427C5.080 3.957 5.333 3.343 5.333 2.667C5.333 1.193 4.140 0.000 2.667 0.000C1.193 0.000 0.000 1.193 0.000 2.667C0.000 3.343 0.253 3.957 0.667 4.427C0.667 4.427 0.667 6.537 0.667 6.537ZM2.667 0.667C3.770 0.667 4.667 1.563 4.667 2.667C4.667 3.770 3.770 4.667 2.667 4.667C1.563 4.667 0.667 3.770 0.667 2.667C0.667 1.563 1.563 0.667 2.667 0.667Z" fillRule="nonzero" fill="#FFFFFF" />
          </svg>
        </span>
      )}
    </span>
  );
}

function CommentNotificationIcon({ count }: { count: number }) {
  return (
    <span className={`notification-icon comment-notification ${count > 0 ? "active" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 16.67 16.67" width="16.67" height="16.67" xmlns="http://www.w3.org/2000/svg" className="notification-icon-main">
        <path d="M15.000 0.000C15.000 0.000 1.667 0.000 1.667 0.000C0.750 0.000 0.008 0.750 0.008 1.667C0.008 1.667 0.000 16.667 0.000 16.667C0.000 16.667 3.333 13.333 3.333 13.333C3.333 13.333 15.000 13.333 15.000 13.333C15.917 13.333 16.667 12.583 16.667 11.667C16.667 11.667 16.667 1.667 16.667 1.667C16.667 0.750 15.917 0.000 15.000 0.000ZM4.167 5.833C4.167 5.833 12.500 5.833 12.500 5.833C12.958 5.833 13.333 6.208 13.333 6.667C13.333 7.125 12.958 7.500 12.500 7.500C12.500 7.500 4.167 7.500 4.167 7.500C3.708 7.500 3.333 7.125 3.333 6.667C3.333 6.208 3.708 5.833 4.167 5.833ZM9.167 10.000C9.167 10.000 4.167 10.000 4.167 10.000C3.708 10.000 3.333 9.625 3.333 9.167C3.333 8.708 3.708 8.333 4.167 8.333C4.167 8.333 9.167 8.333 9.167 8.333C9.625 8.333 10.000 8.708 10.000 9.167C10.000 9.625 9.625 10.000 9.167 10.000ZM12.500 5.000C12.500 5.000 4.167 5.000 4.167 5.000C3.708 5.000 3.333 4.625 3.333 4.167C3.333 3.708 3.708 3.333 4.167 3.333C4.167 3.333 12.500 3.333 12.500 3.333C12.958 3.333 13.333 3.708 13.333 4.167C13.333 4.625 12.958 5.000 12.500 5.000Z" fillRule="nonzero" fill={count > 0 ? "#1DA750" : "#DBE0E7"} />
      </svg>
      {count > 0 && <span className="notification-badge badge-comment">{count}</span>}
    </span>
  );
}

const baseFlights = [
  { code: "TK2070", route: "IST  ›  AMS", time: "14:30", state: "FO", tone: "green", gate: "32", boardingTime: "17:00", arrivalTime: "20:30", seats: "100", regNo: "GRDE6/ N63", announceTime: "17:30" },
  { code: "TK0706", route: "IST  ›  KBL", time: "15:20/15:55", state: "FO", tone: "green", gate: "18", boardingTime: "16:10", arrivalTime: "22:15", seats: "86", regNo: "TC-LAM / A321", announceTime: "16:40" },
  { code: "TK2911", route: "IST  ›  SFO", time: "16:55", state: "FH", tone: "yellow", gate: "11", boardingTime: "18:25", arrivalTime: "23:50", seats: "74", regNo: "TC-JET / B787", announceTime: "18:05" },
] satisfies FlightRecord[];

type FlightRecord = {
  code: string;
  route: string;
  time: string;
  state: "FO" | "FH";
  tone: "green" | "yellow";
  gate: string;
  boardingTime: string;
  arrivalTime: string;
  seats: string;
  regNo: string;
  announceTime: string;
  multiLeg?: {
    selectedIndex: number;
    legs: Array<{
      label: string;
    }>;
  };
};

const generatedFlightTemplates = [
  ["TK1865", "IST  ›  FCO", "13:05", "22", "16:20", "18:45", "118", "TC-JRK / A321", "15:55"],
  ["TK1983", "IST  ›  LHR", "13:40/14:10", "24", "16:45", "20:15", "92", "TC-LSM / A330", "16:05"],
  ["TK1857", "IST  ›  MAD", "14:05", "27", "16:55", "19:30", "64", "TC-JHM / B737", "16:25"],
  ["TK1785", "IST  ›  CPH", "14:50", "12", "17:15", "20:05", "131", "TC-LCN / A321", "16:50"],
  ["TK1827", "IST  ›  CDG", "15:15/15:45", "41", "17:40", "20:20", "75", "TC-JOA / A330", "17:00"],
  ["TK1959", "IST  ›  BER", "15:35", "06", "18:00", "20:40", "105", "TC-LTR / A321", "17:25"],
  ["TK1909", "IST  ›  ZRH", "16:10", "09", "18:35", "21:10", "88", "TC-JSU / B737", "18:05"],
  ["TK1877", "IST  ›  MXP", "16:45/17:05", "34", "19:10", "21:55", "112", "TC-LDI / A321", "18:40"],
  ["TK1971", "IST  ›  DUB", "17:20", "19", "19:50", "23:20", "69", "TC-JNP / B737", "19:15"],
  ["TK1923", "IST  ›  BSL", "17:55", "29", "20:15", "22:50", "97", "TC-LGB / A321", "19:45"],
  ["TK1037", "IST  ›  BUD", "18:20", "38", "20:45", "22:35", "124", "TC-JVK / A321", "20:05"],
  ["TK1895", "IST  ›  VIE", "18:45/19:05", "14", "21:10", "23:00", "81", "TC-LAA / B737", "20:25"],
  ["TK1849", "IST  ›  ATH", "19:10", "03", "21:25", "23:15", "143", "TC-JYD / A320", "20:55"],
  ["TK1727", "IST  ›  PRG", "19:35", "26", "21:55", "00:05", "109", "TC-LPC / A321", "21:15"],
  ["TK1815", "IST  ›  NCE", "20:05/20:30", "31", "22:25", "01:10", "72", "TC-JKA / B737", "21:50"],
  ["TK1883", "IST  ›  HAM", "20:40", "07", "23:05", "01:35", "94", "TC-LSF / A321", "22:20"],
] as const;

const defaultFlightDateKey = "2026-01-29";

function adjustClock(time: string, minutes: number) {
  return time.split("/").map((part) => {
    const [hour = 0, minute = 0] = part.split(":").map(Number);
    const total = (hour * 60 + minute + minutes + 24 * 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }).join("/");
}

function createDateFlightCode(seed: number, index: number, usedCodes: Set<string>) {
  let codeNumber = 1000 + ((seed * 37 + index * 211) % 8900);
  let code = `TK${codeNumber}`;
  while (usedCodes.has(code)) {
    codeNumber = codeNumber >= 9899 ? 1000 : codeNumber + 17;
    code = `TK${codeNumber}`;
  }
  usedCodes.add(code);
  return code;
}

function createRandomizedFlights(dateKey = defaultFlightDateKey) {
  const seed = seededNumber(dateKey);
  const preserveBaseDate = dateKey === defaultFlightDateKey;
  const usedCodes = new Set<string>();
  const templates = [...baseFlights, ...generatedFlightTemplates.map((template) => {
    const [code, route, time, gate, boardingTime, arrivalTime, seats, regNo, announceTime] = template;
    return { code, route, time, gate, boardingTime, arrivalTime, seats, regNo, announceTime };
  })];

  return templates
    .map((template, index) => {
      const dateOffset = preserveBaseDate ? 0 : seed + index * 19;
      const code = preserveBaseDate ? template.code : createDateFlightCode(seed, index, usedCodes);
      if (preserveBaseDate) usedCodes.add(code);
      const timeShift = preserveBaseDate ? 0 : ((dateOffset % 7) - 3) * 10;
      const delayed = template.time.includes("/") || (!preserveBaseDate && dateOffset % 6 === 0);
      const departureTime = adjustClock(template.time, timeShift);
      const time = delayed && !departureTime.includes("/") ? `${departureTime}/${adjustClock(departureTime, 25)}` : departureTime;
      const seats = String(Math.max(24, Number.parseInt(template.seats, 10) + (preserveBaseDate ? 0 : (dateOffset % 55) - 24)));
      const gate = String(1 + ((Number.parseInt(template.gate, 10) + dateOffset) % 48)).padStart(2, "0");

      return {
        code,
        route: template.route,
        time,
        state: delayed || index % 5 === 2 ? "FH" : "FO",
        tone: delayed || index % 5 === 2 ? "yellow" : "green",
        gate,
        boardingTime: adjustClock(template.boardingTime, timeShift),
        arrivalTime: adjustClock(template.arrivalTime, timeShift),
        seats,
        regNo: template.regNo,
        announceTime: adjustClock(template.announceTime, timeShift),
        multiLeg:
          template.code === "TK1983" || template.code === "TK1849"
            ? {
                selectedIndex: 1,
                legs: [
                  { label: "Istanbul - Karakas" },
                  { label: "Karakas - Havana" },
                  { label: "Havana - İstanbul" },
                ],
              }
            : undefined,
      } satisfies FlightRecord;
    })
    .sort((a, b) => seededNumber(`${dateKey}-${a.code}`) - seededNumber(`${dateKey}-${b.code}`));
}

type Tier = "Elite" | "Classic";
type BaggageTone = "normal" | "alert" | "muted";
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
};

const curatedPassengersByFlight = {
  TK2070: [
    { name: "Furkan", surname: "AYIN", pnr: "A1B2C3", group: "232", seat: "23A", ci: "checked", avatar: "man", baggage: "normal", baggageInfo: { pieces: 1, kg: 18, allowanceKg: 23, paid: false }, apis: "empty", message: 0, tier: "Elite" },
    { name: "Nesibe", surname: "AYIN", pnr: "NO REC", group: "438", seat: "11A", ci: "pending", avatar: "woman", baggage: "alert", baggageInfo: { pieces: 1, kg: 31, allowanceKg: 23, paid: false }, apis: "empty", message: 2, tier: "Classic" },
    { name: "Ayşe", surname: "AYIN", pnr: "G7H8I9", group: "123", seat: "11B", ci: "pending", avatar: "woman dark", baggage: "muted", baggageInfo: { pieces: 2, kg: 34, allowanceKg: 32, paid: true }, apis: "filled", message: 0, tier: "Elite" },
    { name: "Canan", surname: "AYIN", pnr: "D4E5F6", group: "441", seat: "22A", ci: "pending", avatar: "woman", baggage: "normal", baggageInfo: { pieces: 1, kg: 22, allowanceKg: 23, paid: false }, apis: "filled", message: 1, tier: "Classic" },
    { name: "Ozan", surname: "AYIN", pnr: "PQ7R8A", group: "119", seat: "23C", ci: "checked", avatar: "man", baggage: "normal", baggageInfo: { pieces: 1, kg: 12, allowanceKg: 23, paid: false }, apis: "empty", message: 0, tier: "Elite" },
  ],
  TK0706: [
    { name: "Mert", surname: "Kaya", pnr: "Q4W5E6", group: "118", seat: "18C", ci: "checked", avatar: "man", baggage: "normal", baggageInfo: { pieces: 1, kg: 20, allowanceKg: 23, paid: false }, apis: "filled", message: 1, tier: "Classic" },
    { name: "Elif", surname: "Özkan", pnr: "R7T8Y9", group: "204", seat: "20A", ci: "pending", avatar: "woman", baggage: "normal", baggageInfo: { pieces: 1, kg: 28, allowanceKg: 23, paid: true }, apis: "empty", message: 0, tier: "Elite" },
    { name: "Bora", surname: "Arslan", pnr: "P0L9K8", group: "311", seat: "14F", ci: "pending", avatar: "man", baggage: "alert", baggageInfo: { pieces: 2, kg: 42, allowanceKg: 32, paid: false }, apis: "empty", message: 3, tier: "Classic" },
  ],
  TK2911: [
    { name: "Derya", surname: "Taş", pnr: "Z1X2C3", group: "515", seat: "41D", ci: "checked", avatar: "woman dark", baggage: "muted", baggageInfo: { pieces: 2, kg: 36, allowanceKg: 32, paid: true }, apis: "filled", message: 0, tier: "Elite" },
    { name: "Emre", surname: "Kurt", pnr: "V4B5N6", group: "222", seat: "42A", ci: "pending", avatar: "man", baggage: "normal", baggageInfo: { pieces: 1, kg: 19, allowanceKg: 23, paid: false }, apis: "empty", message: 1, tier: "Classic" },
    { name: "Seda", surname: "Acar", pnr: "J7H8J9", group: "907", seat: "39B", ci: "checked", avatar: "woman", baggage: "normal", baggageInfo: { pieces: 1, kg: 21, allowanceKg: 23, paid: false }, apis: "filled", message: 0, tier: "Elite" },
  ],
} satisfies Record<string, PassengerRecord[]>;

type Passenger = PassengerRecord;

const generatedPassengerFirstNames = [
  "Deniz",
  "Selin",
  "Kerem",
  "Ece",
  "Mina",
  "Baran",
  "Lara",
  "Arda",
  "Irem",
  "Umut",
  "Zeynep",
  "Berk",
  "Seda",
  "Mert",
  "Elif",
  "Bora",
  "Derya",
  "Emre",
  "Ceren",
  "Can",
] as const;

const femalePassengerNames = new Set([
  "ayse",
  "canan",
  "ceren",
  "derya",
  "ece",
  "elif",
  "irem",
  "lara",
  "mina",
  "nesibe",
  "seda",
  "selin",
  "zeynep",
]);

const malePassengerNames = new Set([
  "arda",
  "baran",
  "berk",
  "bora",
  "can",
  "emre",
  "furkan",
  "kerem",
  "mert",
  "ozan",
  "umut",
]);

const generatedPassengerSurnames = [
  "Yilmaz",
  "Demir",
  "Arikan",
  "Koc",
  "Aslan",
  "Kilic",
  "Sahin",
  "Polat",
  "Celik",
  "Aydin",
  "Yildiz",
  "Gunes",
  "Tas",
  "Kurt",
  "Acar",
  "Arslan",
  "Kaya",
  "Ozkan",
  "Toprak",
  "Eren",
] as const;

function seededNumber(input: string) {
  return Array.from(input).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 17), 0);
}

function normalizePassengerName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function inferPassengerGenderFromName(name: string): AvatarGender {
  const normalizedName = normalizePassengerName(name);
  if (femalePassengerNames.has(normalizedName)) return "female";
  if (malePassengerNames.has(normalizedName)) return "male";
  return "male";
}

function getPassengerAvatarType(name: string, seed = 0) {
  const gender = inferPassengerGenderFromName(name);
  const avatarTypes = gender === "female"
    ? ["woman", "young-woman", "child-girl"]
    : ["man", "young-man", "child-boy"];
  return avatarTypes[Math.abs(seed) % avatarTypes.length];
}

function createPnr(seed: number, index: number) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `${alphabet[(seed + index) % alphabet.length]}${(seed + index * 7) % 10}${alphabet[(seed + index * 3) % alphabet.length]}${(seed + index * 5) % 10}${alphabet[(seed + index * 11) % alphabet.length]}${(seed + index * 13) % 10}`;
}

function getAircraftCapacity(flight: FlightRecord) {
  if (flight.regNo.includes("B787") || flight.regNo.includes("A330")) return 260;
  if (flight.regNo.includes("A321")) return 190;
  if (flight.regNo.includes("A320")) return 168;
  if (flight.regNo.includes("B737")) return 162;
  return 200;
}

function getCabinCapacities(flight: FlightRecord) {
  const totalCapacity = getAircraftCapacity(flight);

  if (totalCapacity >= 260) return { business: 28, economy: totalCapacity - 28 };
  if (totalCapacity >= 190) return { business: 16, economy: totalCapacity - 16 };
  if (totalCapacity >= 168) return { business: 12, economy: totalCapacity - 12 };
  if (totalCapacity >= 162) return { business: 12, economy: totalCapacity - 12 };
  return { business: 16, economy: totalCapacity - 16 };
}

function getBookedPassengerTarget(flight: FlightRecord) {
  const remainingSeats = Number.parseInt(flight.seats, 10) || 0;
  const capacity = getAircraftCapacity(flight);
  return Math.max(48, Math.min(capacity - 8, capacity - remainingSeats));
}

function createGeneratedPassenger(flight: FlightRecord, seed: number, index: number, targetCount: number, usedNames: Set<string>): PassengerRecord {
  let attempt = 0;
  let firstName = generatedPassengerFirstNames[0];
  let surname = generatedPassengerSurnames[0];
  let avatar = getPassengerAvatarType(firstName, seed + index);

  while (attempt < generatedPassengerFirstNames.length * generatedPassengerSurnames.length) {
    firstName = generatedPassengerFirstNames[(seed + index * 7 + attempt * 3) % generatedPassengerFirstNames.length];
    surname = generatedPassengerSurnames[(seed * 5 + index * 11 + attempt) % generatedPassengerSurnames.length];
    const candidate = `${firstName} ${surname}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      avatar = getPassengerAvatarType(firstName, seed + index + attempt);
      break;
    }
    attempt += 1;
  }

  if (attempt >= generatedPassengerFirstNames.length * generatedPassengerSurnames.length) {
    firstName = generatedPassengerFirstNames[(seed + index) % generatedPassengerFirstNames.length];
    surname = `${generatedPassengerSurnames[(seed + index) % generatedPassengerSurnames.length]} ${index + 1}`;
    avatar = getPassengerAvatarType(firstName, seed + index);
    usedNames.add(`${firstName} ${surname}`);
  }

  const cabinCapacities = getCabinCapacities(flight);
  const businessTarget = Math.min(cabinCapacities.business, Math.max(8, Math.round(targetCount * 0.16)));
  const business = index < businessTarget;
  const row = business ? 1 + (index % 5) : 6 + ((seed + index * 3) % 30);
  const letter = ["A", "B", "C", "D", "E", "F"][(seed + index) % 6];
  const pieces = 1 + ((seed + index) % 8 === 0 ? 1 : 0);
  const allowanceKg = business ? 32 : pieces > 1 ? 30 : 23;
  const overweight = (seed + index * 7) % 9 === 0;
  const kg = overweight ? allowanceKg + 4 + ((seed + index) % 9) : Math.max(8, allowanceKg - 10 + ((seed + index * 5) % 13));
  const checkedTarget = Math.round(targetCount * (flight.tone === "yellow" ? 0.58 : 0.72));

  return {
    name: firstName,
    surname,
    pnr: createPnr(seed, index),
    group: String(100 + ((seed + index * 31) % 800)),
    seat: `${row}${letter}`,
    ci: index < checkedTarget ? "checked" : "pending",
    avatar,
    baggage: overweight ? "alert" : index % 7 === 0 ? "muted" : "normal",
    baggageInfo: { pieces, kg, allowanceKg, paid: overweight && index % 2 === 0 },
    apis: index % 5 === 0 ? "empty" : "filled",
    message: index % 13 === 1 ? 1 + (seed % 3) : 0,
    tier: index % 6 === 0 ? "Elite" : "Classic",
  };
}

function createPassengersForFlight(flight: FlightRecord): PassengerRecord[] {
  const seed = seededNumber(flight.code + flight.route);
  const targetCount = getBookedPassengerTarget(flight);
  const curated = curatedPassengersByFlight[flight.code as keyof typeof curatedPassengersByFlight] ?? [];
  const usedNames = new Set(curated.map((passenger) => `${passenger.name} ${passenger.surname}`));
  const generated = Array.from({ length: Math.max(0, targetCount - curated.length) }, (_, index) =>
    createGeneratedPassenger(flight, seed, index + curated.length, targetCount, usedNames),
  );
  return [...curated, ...generated];
}

function Logo() {
  return <div className="qc-logo" aria-label="QC"><img src={qcMark} alt="" /><img src={qcText} alt="" /></div>;
}

function NotificationBellIcon() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" xmlns="http://www.w3.org/2000/svg" className="notification-svg" aria-hidden="true">
      <defs>
        <filter id="notification-dot-shadow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feDropShadow in="SourceGraphic" dx="0" dy="8" stdDeviation="10" floodColor="#525866" floodOpacity="0.04" result="s0" />
          <feDropShadow in="s0" dx="0" dy="6" stdDeviation="6" floodColor="#525866" floodOpacity="0.04" result="s1" />
          <feDropShadow in="s1" dx="0" dy="2" stdDeviation="1" floodColor="#525866" floodOpacity="0.04" result="s2" />
        </filter>
      </defs>
      <g>
        <g transform="matrix(1 0 0 1 8 8)">
          <path transform="matrix(1 0 0 1 3.678 1.875)" d="M12.397 12.325C12.397 12.325 11.322 11.250 11.322 11.250C11.322 11.250 11.322 7.083 11.322 7.083C11.322 4.525 9.955 2.383 7.572 1.817C7.572 1.817 7.572 1.250 7.572 1.250C7.572 0.558 7.014 0.000 6.322 0.000C5.630 0.000 5.072 0.558 5.072 1.250C5.072 1.250 5.072 1.817 5.072 1.817C2.680 2.383 1.322 4.517 1.322 7.083C1.322 7.083 1.322 11.250 1.322 11.250C1.322 11.250 0.247 12.325 0.247 12.325C-0.278 12.850 0.089 13.750 0.830 13.750C0.830 13.750 11.805 13.750 11.805 13.750C12.555 13.750 12.922 12.850 12.397 12.325ZM9.655 12.083C9.655 12.083 2.989 12.083 2.989 12.083C2.989 12.083 2.989 7.083 2.989 7.083C2.989 5.017 4.247 3.333 6.322 3.333C8.397 3.333 9.655 5.017 9.655 7.083C9.655 7.083 9.655 12.083 9.655 12.083ZM6.322 16.250C7.239 16.250 7.989 15.500 7.989 14.583C7.989 14.583 4.655 14.583 4.655 14.583C4.655 15.500 5.397 16.250 6.322 16.250Z" fillRule="nonzero" fill="#222530" />
        </g>
        <g transform="matrix(1 0 0 1 22 8)" filter="url(#notification-dot-shadow)">
          <g>
            <path d="M6.000 3.000C6.000 4.657 4.657 6.000 3.000 6.000C1.343 6.000 0.000 4.657 0.000 3.000C0.000 1.343 1.343 0.000 3.000 0.000C4.657 0.000 6.000 1.343 6.000 3.000Z" fillRule="nonzero" fill="#FF3D32" />
            <path d="M6.000 3.000C6.000 4.657 4.657 6.000 3.000 6.000C1.343 6.000 0.000 4.657 0.000 3.000C0.000 1.343 1.343 0.000 3.000 0.000C4.657 0.000 6.000 1.343 6.000 3.000Z" vectorEffect="non-scaling-stroke" fill="none" stroke="#FFFFFF" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function TopBar() {
  return (
    <header className="qc-topbar">
      <div className="brand-product-container">
        <Logo />
        <div className="product-container">
          <button className="product-switch"><span className="status-dot"><Icon icon="check" size={13} /></span>Check-in<Icon icon="keyboard_arrow_down" size={17} /></button>
          <button className="product-switch printer"><Icon icon="device_hub" size={18} />HP Printer<Icon icon="keyboard_arrow_down" size={17} /></button>
        </div>
      </div>
      <label className="quick-search"><input aria-label="Hızlı arama" placeholder="Hızlı Prompt..." /><Icon icon="hotel_class" size={19} /></label>
      <button className="bare-button notification" aria-label="Bildirimler"><NotificationBellIcon /></button>
      <button className="profile" aria-label="Profil"><span className="profile-head" /><span className="profile-body" /></button>
    </header>
  );
}

function AppRail({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className="app-rail" aria-label="Uygulama menüsü">
      <button
        className="rail-collapse"
        aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}
        aria-pressed={collapsed}
        onClick={onToggle}
      >
        <Icon icon={collapsed ? "chevron_right" : "chevron_left"} size={22} />
      </button>
      <span className="rail-caption">Seçenek</span>
      <span className="rail-code">+NR</span>
      <span className="rail-tile">UB</span>
      <span className="rail-code">M&S</span>
      <span className="rail-label">Header</span>
      {[0, 1, 2, 3].map((item) => <button key={item} className="plane-button" aria-label={`Uçuş görünümü ${item + 1}`}><Icon icon="flight" size={22} fill /></button>)}
      <div className="rail-bottom"><button aria-label="Ayarlar"><Icon icon="settings" size={21} fill /></button><button aria-label="Daha fazla"><Icon icon="more_horiz" size={22} /></button></div>
    </aside>
  );
}

function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function FlightList({
  flights,
  selected,
  onSelect,
  selectedDate,
  onDateChange,
  collapsed,
  panelRef,
}: {
  flights: FlightRecord[];
  selected: number;
  onSelect: (index: number) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  collapsed: boolean;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const datePickerRef = useRef<HTMLDivElement>(null);
  const datePickerPopoverRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!datePickerOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (datePickerRef.current?.contains(target)) return;
      if (datePickerPopoverRef.current?.contains(target)) return;
      setDatePickerOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [datePickerOpen]);

  const openDatePicker = () => {
    const rect = datePickerRef.current?.getBoundingClientRect();
    if (rect) setDatePickerPosition({ top: rect.bottom + 4, left: rect.left });
    setDatePickerOpen((open) => !open);
  };

  const shiftDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    onDateChange(next);
  };
  const visibleFlights = flights
    .map((flight, index) => ({ flight, index }))
    .filter(({ flight }) => {
      if (!normalizedQuery) return true;
      return [
        flight.code,
        flight.route,
        flight.time,
        flight.state,
        flight.regNo,
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });

  return (
    <aside ref={panelRef} className={`flight-sidebar ${collapsed ? "collapsed" : ""}`.trim()} aria-hidden={collapsed}>
      <div className="flight-sidebar-track">
        <div className="flight-title"><h2>Flight List</h2><button aria-label="Uçuş listesi seçenekleri"><Icon icon="more_horiz" size={22} /></button></div>
        <div className="date-picker" ref={datePickerRef}>
          <button aria-label="Önceki gün" onClick={() => shiftDate(-1)}><Icon icon="chevron_left" size={20} /></button>
          <button type="button" className="date-picker-trigger" onClick={openDatePicker}>{formatShortDate(selectedDate)}</button>
          <button aria-label="Sonraki gün" onClick={() => shiftDate(1)}><Icon icon="chevron_right" size={20} /></button>
          {datePickerOpen && createPortal(
            <div className="date-picker-popover" ref={datePickerPopoverRef} style={{ top: datePickerPosition.top, left: datePickerPosition.left }}>
              <TkDatepicker
                inline
                value={toIsoDateString(selectedDate)}
                onTkChange={(event) => {
                  const detail = event.detail;
                  if (typeof detail === "string" && detail) {
                    const [year, month, day] = detail.split("-").map(Number);
                    onDateChange(new Date(year, month - 1, day));
                  }
                  setDatePickerOpen(false);
                }}
              />
            </div>,
            document.body,
          )}
        </div>
        <label className="sidebar-label">Select<sup>*</sup></label>
        <button className="terminal-select">Terminal <Icon icon="keyboard_arrow_up" size={17} /></button>
        <label className="sidebar-label search-label">Search<sup>*</sup></label>
        <label className="flight-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Airport, flight code, time..." aria-label="Uçuş ara" /><Icon icon="search" size={19} /></label>
        <div className="flight-items">
          {visibleFlights.map(({ flight, index }) => (
            <button key={flight.code} className={`flight-item ${selected === index ? "selected" : ""}`} onClick={() => onSelect(index)}>
              <span className="flight-line"><b>{flight.code}</b><em className={flight.tone}>{flight.state}</em></span>
              <span className="flight-line"><FlightRoute route={flight.route} /><time className={flight.time.includes("/") ? "delayed" : ""}>{flight.time}</time></span>
            </button>
          ))}
          {visibleFlights.length === 0 && <div className="flight-empty-state">Uçuş bulunamadı</div>}
        </div>
      </div>
    </aside>
  );
}

const flightInfoTabs = [
  { id: "flight", label: "Uçuş Bilgileri", badgeCount: "01" },
  { id: "inout", label: "Inbound/outbound", badgeCount: "01" },
  { id: "emd", label: "EMD/EBIT Özet", badgeCount: "01" },
  { id: "baggage", label: "Bagaj Bilgileri", badgeCount: "01" },
  { id: "ops", label: "Uçuş Operasyon", badgeCount: "01" },
  { id: "reg", label: "Reg No Uçuşlar", badgeCount: "01" },
] as const;

type FlightInfoTab = typeof flightInfoTabs[number]["id"];

const flightInfoStats = [
  { label: "Codeshare", value: "AV6632.." },
  { label: "Kalkış Zamanı", value: "17:45" },
  { label: "Ekip Bilgisi", value: "2 / 3" },
  { label: "Uçuş Süresi", value: "5 sa 30 dk" },
  { label: "Available Jumpseat", value: "5" },
  { label: "Uçuş Süresi", value: "5 sa 30 dk" },
];

const inOutRows = [
  { type: "Inbound", flight: "TK2069", route: "AMS › IST", sta: "13:45", eta: "13:38", gate: "32", status: "Landed" },
  { type: "Outbound", flight: "TK2070", route: "IST › AMS", sta: "14:45", eta: "14:45", gate: "32", status: "Flight Open" },
  { type: "Connection", flight: "TK1953", route: "AMS › OSL", sta: "17:20", eta: "17:25", gate: "D12", status: "On Time" },
];

const emdRows = [
  { name: "Accepted", business: 0, economy: 0, businessNo: 2, economyNo: 2 },
  { name: "No Show", business: 0, economy: 0, businessNo: 6, economyNo: 6 },
  { name: "No-Emd", business: 16, economy: 16, businessNo: 135, economyNo: 135 },
  { name: "STA NOK", business: 0, economy: 0, businessNo: 6, economyNo: 6 },
  { name: "Jumpseat", business: 0, economy: 0, businessNo: 0, economyNo: 0 },
  { name: "Total EMD", business: 0, economy: 0, businessNo: 2, economyNo: 2 },
];

const baggageDetailRows = [
  { className: "Business", count: 0, weight: 0, noEmd: 0, noEmdWeight: 0 },
  { className: "Economy", count: 16, weight: 139, noEmd: 2, noEmdWeight: 18 },
  { className: "Exc PC", count: 0, weight: 0, noEmd: 0, noEmdWeight: 0 },
  { className: "Exc kg", count: 0, weight: 0, noEmd: 0, noEmdWeight: 0 },
];

const operationRows = [
  { item: "Boarding", owner: "Gate", time: "17:00", state: "Ready" },
  { item: "Catering", owner: "Ramp", time: "16:35", state: "Completed" },
  { item: "Fuel", owner: "Ops", time: "16:42", state: "Completed" },
  { item: "Load Sheet", owner: "DCS", time: "17:10", state: "Waiting" },
];

type FlightStatusCode = "FO" | "FE" | "FT";

type FlightStatusDefinition = {
  code: FlightStatusCode;
  label: string;
  description: string;
};

const flightStatusDefinitions: FlightStatusDefinition[] = [
  { code: "FO", label: "Flight Open", description: "Uçuş yolcu işlemlerine açık durumda" },
  { code: "FE", label: "Flight Editing", description: "Yolculara bilgi girişi yapılabilir durumda" },
  { code: "FT", label: "Flight Thru", description: "Inboundlu yolculara diğer istasyonlardan check-in" },
];

const flightStatusByCode = Object.fromEntries(
  flightStatusDefinitions.map((status) => [status.code, status]),
) as Record<FlightStatusCode, FlightStatusDefinition>;

function FlightOverview({ flight, passengers, expanded, onExpandedChange }: { flight: FlightRecord; passengers: Passenger[]; expanded: boolean; onExpandedChange: (expanded: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<FlightInfoTab>("flight");
  const expandedPresence = useAnimatedPresence(expanded, 220);
  const stats = getFlightStats(flight, passengers);
  const checkedWidth = stats.totalPassenger ? Math.round((stats.checked / stats.totalPassenger) * 100) : 0;
  const bookedWidth = stats.totalPassenger ? Math.round((stats.booked / stats.totalPassenger) * 100) : 0;
  const showPassengersLabel = checkedWidth >= 32;
  const cabinCapacities = getCabinCapacities(flight);

  useEffect(() => {
    if (!expanded) setActiveTab("flight");
  }, [expanded]);

  return (
    <section className={`flight-overview ${expandedPresence.isMounted ? "expanded" : ""}`}>
      <div className="overview-head">
        <div className="overview-title">
          <Icon icon="flight" size={25} fill />
          <strong>{flight.code}</strong>
          <span>19 FEB <b>{flight.time}</b> /14:45</span>
          {flight.multiLeg ? <OverviewRouteSelector flight={flight} /> : <FlightRoute route={flight.route} className="overview-route blue" />}
          <FlightStatusControl flightCode={flight.code} />
        </div>
        <button aria-label="Uçuş seçenekleri"><Icon icon="more_horiz" size={23} /></button>
      </div>
      <div className="cabin-counts"><span>Economy {stats.economy}</span><span>Business {stats.business}</span><span>Total Passenger {stats.totalPassenger}</span></div>
      {expanded ? (
        <ExpandedCabinPassengerProgress
          key={`${flight.code}-${flight.time}-expanded`}
          economy={{
            capacity: cabinCapacities.economy,
            booked: stats.economy,
            checked: stats.economyChecked,
            standby: Math.max(0, stats.economy - stats.economyChecked),
          }}
          business={{
            capacity: cabinCapacities.business,
            booked: stats.business,
            checked: stats.businessChecked,
            standby: Math.max(0, stats.business - stats.businessChecked),
          }}
        />
      ) : (
        <AnimatedPassengerProgress
          key={`${flight.code}-${flight.time}`}
          checkedWidth={checkedWidth}
          bookedWidth={bookedWidth}
          checkedCount={stats.checked}
          bookedCount={stats.booked}
          remainingSeats={stats.remainingSeats}
          showPassengersLabel={showPassengersLabel}
        />
      )}
      {!expandedPresence.isMounted && <FlightFacts flight={flight} />}
      {expandedPresence.isMounted && (
        <div className="flight-info-presence" data-state={expandedPresence.isVisible ? "open" : "closed"}>
          <FlightFacts flight={flight} />
          <FlightInfoExpandedContent flight={flight} passengers={passengers} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      )}
      <button type="button" className="more-overview" aria-expanded={expanded} onClick={() => onExpandedChange(!expanded)}>
        {expanded ? "Less" : "More"} <Icon icon="keyboard_arrow_down" size={14} />
      </button>
    </section>
  );
}

function FlightFacts({ flight }: { flight: FlightRecord }) {
  return (
    <div className="flight-facts">
      <div><small>Gate <Icon icon="edit" size={14} /></small><b>{flight.gate}</b></div>
      <div><small>Boarding Time <Icon icon="edit" size={14} /></small><b>{flight.boardingTime}</b></div>
      <div><small>Arrival Time</small><b>{flight.arrivalTime}</b></div>
      <div><small>Kalan Koltuk</small><b className="link">{flight.seats}</b></div>
      <div><small>Reg No/ Uçak Tipi <Icon icon="edit" size={14} /></small><b>{flight.regNo}</b></div>
      <div><small>Anons Zamanı</small><b className="danger">{flight.announceTime}</b></div>
    </div>
  );
}

function FlightStatusControl({ flightCode }: { flightCode: string }) {
  const [currentCode, setCurrentCode] = useState<FlightStatusCode>("FO");
  const [open, setOpen] = useState(false);
  const [pendingCode, setPendingCode] = useState<FlightStatusCode>("FT");
  const [view, setView] = useState<"menu" | "confirm">("menu");
  const [hoveredCode, setHoveredCode] = useState<FlightStatusCode | null>(null);
  const statusControlRef = useRef<HTMLDivElement>(null);
  const currentStatus = flightStatusByCode[currentCode];
  const pendingStatus = flightStatusByCode[pendingCode];
  const statusOptions = flightStatusDefinitions.filter((status) => status.code !== currentCode);

  useEffect(() => {
    setCurrentCode("FO");
    setOpen(false);
    setView("menu");
    setPendingCode("FT");
  }, [flightCode]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!statusControlRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const openMenu = () => {
    setOpen((isOpen) => {
      const nextOpen = !isOpen;
      if (nextOpen) setView("menu");
      return nextOpen;
    });
  };

  const selectStatus = (status: FlightStatusDefinition) => {
    setPendingCode(status.code);
    setHoveredCode(null);
    setView("confirm");
  };

  const applyStatus = () => {
    setCurrentCode(pendingCode);
    setOpen(false);
    setView("menu");
    setHoveredCode(null);
  };

  return (
    <div className="flight-status-control" ref={statusControlRef}>
      <button type="button" className="flight-status-trigger" aria-expanded={open} onClick={openMenu}>
        {currentStatus.label}
      </button>
      {open && (
        <div className={`flight-status-popover ${view === "confirm" ? "confirm" : "menu"}`} role="dialog" aria-label="Uçuş statüsü">
          <span className="flight-status-popover-arrow" aria-hidden="true" />
          {view === "menu" ? (
            <div className="flight-status-options">
              {statusOptions.map((status) => (
                <button type="button" className="flight-status-option" key={status.code} onClick={() => selectStatus(status)}>
                  <span className="flight-status-mini-badge">{status.code}</span>
                  <span className="flight-status-option-copy">
                    <strong>{status.label}</strong>
                    <small>{status.description}</small>
                  </span>
                  <Icon icon="keyboard_arrow_right" size={20} />
                </button>
              ))}
            </div>
          ) : (
            <div className="flight-status-warning">
              <div className="flight-status-warning-content">
                <small>Uyarı</small>
                <FlightStatusFlowPreview
                  from={currentStatus}
                  to={pendingStatus}
                  hoveredCode={hoveredCode}
                  onHover={setHoveredCode}
                />
                <p>
                  "{flightCode} uçağının uçuş statüsü {currentStatus.label}'dan {pendingStatus.label} olarak değiştirilecektir"
                  <br />
                  <br />
                  Bu işlem geri alınamaz.
                </p>
              </div>
              <div className="flight-status-actions">
                <button type="button" className="flight-status-apply" onClick={applyStatus}>Uygula</button>
                <button type="button" className="flight-status-back" aria-label="Geri dön" onClick={() => setView("menu")}>
                  <Icon icon="undo" size={22} fill />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlightStatusFlowPreview({
  from,
  to,
  hoveredCode,
  onHover,
}: {
  from: FlightStatusDefinition;
  to: FlightStatusDefinition;
  hoveredCode: FlightStatusCode | null;
  onHover: (code: FlightStatusCode | null) => void;
}) {
  return (
    <div className="flight-status-flow" data-has-hover={hoveredCode ? "true" : "false"}>
      {[from, to].map((status, index) => (
        <Fragment key={status.code}>
          {index > 0 && <span className="flight-status-flow-line" aria-hidden="true" />}
          <button
            type="button"
            className="flight-status-flow-badge"
            data-hovered={hoveredCode === status.code}
            onMouseEnter={() => onHover(status.code)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(status.code)}
            onBlur={() => onHover(null)}
            aria-label={`${status.code} ${status.label}`}
          >
            <span className="flight-status-code">{status.code}</span>
            <em className="flight-status-full-label">{status.label}</em>
          </button>
        </Fragment>
      ))}
    </div>
  );
}

type CabinProgressData = {
  capacity: number;
  booked: number;
  checked: number;
  standby: number;
};

function ExpandedCabinPassengerProgress({
  economy,
  business,
}: {
  economy: CabinProgressData;
  business: CabinProgressData;
}) {
  const [animatedRows, setAnimatedRows] = useState({
    economy: { checked: 0, booked: 0 },
    business: { checked: 0, booked: 0 },
  });

  useEffect(() => {
    let frame = 0;

    setAnimatedRows({
      economy: { checked: 0, booked: 0 },
      business: { checked: 0, booked: 0 },
    });

    frame = window.requestAnimationFrame(() => {
      setAnimatedRows({
        economy: {
          checked: economy.capacity ? Math.round((economy.checked / economy.capacity) * 100) : 0,
          booked: economy.capacity ? Math.round((economy.booked / economy.capacity) * 100) : 0,
        },
        business: {
          checked: business.capacity ? Math.round((business.checked / business.capacity) * 100) : 0,
          booked: business.capacity ? Math.round((business.booked / business.capacity) * 100) : 0,
        },
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [economy.capacity, economy.booked, economy.checked, business.capacity, business.booked, business.checked]);

  return (
    <div className="expanded-passenger-progress">
      <CabinProgressRow
        tone="economy"
        label="Economy"
        remains={Math.max(0, economy.capacity - economy.booked)}
        booked={economy.booked}
        checked={economy.checked}
        standby={economy.standby}
        animatedCheckedWidth={animatedRows.economy.checked}
        animatedBookedWidth={animatedRows.economy.booked}
      />
      <CabinProgressRow
        tone="business"
        label="Business"
        remains={Math.max(0, business.capacity - business.booked)}
        booked={business.booked}
        checked={business.checked}
        standby={business.standby}
        animatedCheckedWidth={animatedRows.business.checked}
        animatedBookedWidth={animatedRows.business.booked}
      />
    </div>
  );
}

function CabinProgressRow({
  tone,
  label,
  remains,
  booked,
  checked,
  standby,
  animatedCheckedWidth,
  animatedBookedWidth,
}: {
  tone: "economy" | "business";
  label: string;
  remains: number;
  booked: number;
  checked: number;
  standby: number;
  animatedCheckedWidth: number;
  animatedBookedWidth: number;
}) {
  return (
    <div className="cabin-progress-row">
      <div className="cabin-progress-track">
        <div className="cabin-progress-remaining">
          <span>{remains} Passenger Remains</span>
        </div>
        <div className={`cabin-progress-booked ${tone}`} style={{ width: `${animatedBookedWidth}%` }}>
          <div className="cabin-progress-booked-inner">
            <span><Icon icon="expand_circle_down" size={18} />Checked-in</span>
            <span>{booked} Booked <Icon icon="person" size={16} fill /></span>
          </div>
        </div>
        <div className={`cabin-progress-checked ${tone}`} style={{ width: `${animatedCheckedWidth}%` }}>
          <div className="cabin-progress-checked-inner">
            <span><span className={tone === "business" ? "cabin-progress-icon rotated" : "cabin-progress-icon"}><Icon icon="expand_circle_down" size={18} /></span>{label}</span>
            <span>{checked} Checked-In <Icon icon="person" size={16} fill /></span>
          </div>
        </div>
      </div>
      <div className="cabin-progress-standby">
        <span>Standby</span>
        <span>{standby} Passenger <Icon icon="person" size={16} fill /></span>
      </div>
    </div>
  );
}

function AnimatedPassengerProgress({
  checkedWidth,
  bookedWidth,
  checkedCount,
  bookedCount,
  remainingSeats,
  showPassengersLabel,
}: {
  checkedWidth: number;
  bookedWidth: number;
  checkedCount: number;
  bookedCount: number;
  remainingSeats: number;
  showPassengersLabel: boolean;
}) {
  const [animatedProgress, setAnimatedProgress] = useState({ checked: 0, booked: 0 });

  useEffect(() => {
    let frame = 0;

    setAnimatedProgress({ checked: 0, booked: 0 });

    frame = window.requestAnimationFrame(() => {
      setAnimatedProgress({ checked: checkedWidth, booked: bookedWidth });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [checkedWidth, bookedWidth]);

  return (
    <div className="passenger-progress flight-progress-expanded">
      <div className="checked-progress" style={{ width: `${animatedProgress.checked}%` }}><span><Icon icon="expand_circle_down" size={18} />{showPassengersLabel && "Passengers"}</span><span>{checkedCount} Checked-In <Icon icon="person" size={17} fill /></span></div>
      <div className="booked-progress" style={{ left: 0, width: `${animatedProgress.booked}%` }}><span>{bookedCount} Booked <Icon icon="person" size={17} fill /></span></div>
      <span className="remaining">{remainingSeats} Seats Remain</span>
    </div>
  );
}

function OverviewRouteSelector({ flight }: { flight: FlightRecord }) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(flight.multiLeg?.selectedIndex ?? 0);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const legs = flight.multiLeg?.legs ?? [];
  const { isMounted, isVisible } = useAnimatedPresence(open, 170);

  useEffect(() => {
    setSelectedIndex(flight.multiLeg?.selectedIndex ?? 0);
    setOpen(false);
  }, [flight.code, flight.multiLeg?.selectedIndex]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!selectorRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="overview-route-selector" ref={selectorRef}>
      <button
        type="button"
        className={`overview-route-trigger ${open ? "open" : ""}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${flight.code} multi-leg route selector`}
        onClick={() => setOpen((current) => !current)}
      >
        <FlightRoute route={flight.route} className="overview-route blue" />
        <span className="overview-route-chevron" aria-hidden="true">
          <Icon icon={open ? "expand_less" : "keyboard_arrow_down"} size={18} />
        </span>
      </button>
      {isMounted && (
        <div
          className="overview-route-popover"
          data-state={isVisible ? "open" : "closed"}
          role="dialog"
          aria-label={`${flight.code} leg listesi`}
        >
          <span className="overview-route-popover-arrow" aria-hidden="true" />
          <div className="overview-route-popover-list">
            {legs.map((leg, index) => {
              const active = index === selectedIndex;
              return (
                <button
                  type="button"
                  key={`${flight.code}-${leg.label}`}
                  className={`overview-route-option ${active ? "active" : ""}`.trim()}
                  onClick={() => setSelectedIndex(index)}
                >
                  <span className={`overview-route-option-icon ${active ? "active" : ""}`.trim()}>
                    <Icon icon="flight" size={16} fill />
                  </span>
                  <span className="overview-route-option-label">{leg.label}</span>
                  <span className="overview-route-option-check" aria-hidden="true">
                    {active ? <Icon icon="check" size={16} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FlightInfoTabContent({ tabId, flight, passengers }: { tabId: FlightInfoTab; flight: FlightRecord; passengers: Passenger[] }) {
  switch (tabId) {
    case "flight":
      return <FlightInfoGeneralTab flight={flight} passengers={passengers} />;
    case "inout":
      return <InboundOutboundTab flight={flight} passengers={passengers} />;
    case "emd":
      return <EmdEbitTab passengers={passengers} />;
    case "baggage":
      return <BaggageInfoTab flight={flight} passengers={passengers} />;
    case "ops":
      return <OperationsTab flight={flight} />;
    case "reg":
      return <RegNoFlightsTab flight={flight} />;
    default:
      return null;
  }
}

function FlightInfoExpandedContent({ flight, passengers, activeTab, onTabChange }: { flight: FlightRecord; passengers: Passenger[]; activeTab: FlightInfoTab; onTabChange: (tab: FlightInfoTab) => void }) {
  const tabsRef = useRef<HTMLElement | null>(null);
  const activeTabIndex = Math.max(0, flightInfoTabs.findIndex((tab) => tab.id === activeTab));
  const stats = getFlightStats(flight, passengers);
  const expandedStats = [
    { label: "Codeshare", value: `${flight.code.replace("TK", "AV")}..` },
    { label: "Kalkış Zamanı", value: flight.boardingTime },
    { label: "Ekip Bilgisi", value: `${Math.max(2, Math.ceil(stats.booked / 3))} / ${Math.max(3, Math.ceil(stats.totalPassenger / 45))}` },
    { label: "Uçuş Süresi", value: flight.time.includes("/") ? "5 sa 30 dk" : "3 sa 20 dk" },
    { label: "Available Jumpseat", value: String(Math.max(0, Math.floor(stats.remainingSeats / 20))) },
    { label: "Booked Passenger", value: String(stats.booked) },
  ];

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    const handleTabEvent = (event: Event) => {
      const index = (event as CustomEvent<number>).detail;
      const tab = flightInfoTabs[index];
      if (tab) onTabChange(tab.id);
    };

    tabs.addEventListener("tk-tab-click", handleTabEvent as EventListener);
    tabs.addEventListener("tk-tab-change", handleTabEvent as EventListener);
    return () => {
      tabs.removeEventListener("tk-tab-click", handleTabEvent as EventListener);
      tabs.removeEventListener("tk-tab-change", handleTabEvent as EventListener);
    };
  }, [onTabChange]);

  return (
    <div className="flight-info-expanded-content">
      <div className="flight-extra-facts">
        {expandedStats.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <small>{item.label}</small>
            <b>{item.value}</b>
          </div>
        ))}
      </div>
      <div className="flight-info-master-panel">
        {createElement(
          "tk-tabs",
          {
            ref: tabsRef,
            activeIndex: activeTabIndex,
            controlled: true,
            alignHeaders: "start",
            size: "small",
            type: "basic",
            variant: "primary",
            spreadHeaders: false,
            contentStyle: { paddingTop: "16px" },
          },
          flightInfoTabs.map((tab, index) =>
            createElement(
              "tk-tabs-item",
              {
                key: tab.id,
                label: tab.label,
                disabled: false,
                badged: true,
                badgeCount: tab.badgeCount,
              },
              activeTabIndex === index ? <FlightInfoTabContent tabId={tab.id} flight={flight} passengers={passengers} /> : null,
            ),
          ),
        )}
      </div>
    </div>
  );
}

function FlightInfoPanel({ title, icon, actions = true, children, className = "" }: { title: string; icon?: string; actions?: boolean; children: ReactNode; className?: string }) {
  return (
    <section className={`fi-paper-panel ${className}`.trim()}>
      <header className="fi-paper-header">
        <div className="fi-paper-title">
          {icon && <Icon icon={icon} size={20} />}
          <strong>{title}</strong>
        </div>
        {actions && (
          <div className="fi-paper-actions">
            <button type="button"><span>Refresh</span><Icon icon="refresh" size={18} /></button>
            <button type="button"><span>Print</span><Icon icon="print" size={18} /></button>
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

function FlightInfoTopActions({ children }: { children?: ReactNode }) {
  return (
    <div className="fi-source-topbar">
      {children}
      <div className="fi-source-actions">
        <button type="button"><span>Refresh</span><Icon icon="refresh" size={18} /></button>
        <button type="button"><span>Print</span><Icon icon="print" size={18} /></button>
      </div>
    </div>
  );
}

function FlightInfoSourceCard({ title, icon, children, className = "", menu = true, action }: { title: string; icon?: string; children: ReactNode; className?: string; menu?: boolean; action?: ReactNode }) {
  return (
    <section className={`fi-source-card ${className}`.trim()}>
      <header className="fi-source-card-header">
        <div className="fi-source-card-title">
          {icon && <Icon icon={icon} size={20} />}
          <strong>{title}</strong>
        </div>
        {action ?? (menu && <button type="button" className="fi-card-menu" aria-label={`${title} seçenekleri`}><Icon icon="more_vert" size={24} /></button>)}
      </header>
      <div className="fi-source-card-body">{children}</div>
    </section>
  );
}

function FlightInfoMetric({ label, value, total, remaining, progress, caption }: { label: string; value: string; total?: string; remaining?: string; progress?: number; caption?: string }) {
  const progressCaption = caption ?? (typeof progress === "number" ? `${progress}% Tamamlandı` : "");

  return (
    <div className="fi-reference-metric">
      <div className="fi-reference-metric-row">
        <div>
          <span>{label}</span>
          <strong>{value}{total && <small>/{total}</small>}</strong>
        </div>
        {remaining && <em>{remaining}</em>}
      </div>
      {typeof progress === "number" && (
        <>
          <i><b style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></i>
          <div className="fi-reference-progress-labels"><span>0%</span><b>{progressCaption}</b></div>
        </>
      )}
    </div>
  );
}

function FlightInfoKpiPair({ items }: { items: Array<{ value: string; label: string; suffix?: string }> }) {
  return (
    <div className="fi-reference-kpis">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`}>
          <strong>{item.value}{item.suffix && <small>{item.suffix}</small>}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function FlightInfoSubsectionMetrics({
  title,
  items,
  icon = "receipt",
}: {
  title: string;
  icon?: string;
  items: Array<{ value: string; label: string; suffix?: string }>;
}) {
  return (
    <div className="fi-summary-subsection">
      <div className="fi-summary-subsection-label">
        <Icon icon={icon} size={20} />
        <span>{title}</span>
      </div>
      <FlightInfoKpiPair items={items} />
    </div>
  );
}

function routeAirportCodes(route: string) {
  return route.split("›").map((part) => part.trim()).filter(Boolean);
}

function getPassengerCabin(passenger: Passenger) {
  const row = Number.parseInt(passenger.seat, 10);
  return Number.isFinite(row) && row <= 5 ? "business" : "economy";
}

function getFlightStats(flight: FlightRecord, passengers: Passenger[]) {
  const checked = passengers.filter((passenger) => passenger.ci === "checked");
  const business = passengers.filter((passenger) => getPassengerCabin(passenger) === "business");
  const economy = passengers.filter((passenger) => getPassengerCabin(passenger) === "economy");
  const businessChecked = business.filter((passenger) => passenger.ci === "checked").length;
  const economyChecked = economy.filter((passenger) => passenger.ci === "checked").length;
  const pieces = passengers.reduce((total, passenger) => total + passenger.baggageInfo.pieces, 0);
  const kilograms = passengers.reduce((total, passenger) => total + passenger.baggageInfo.kg, 0);
  const paidOverweight = passengers.filter((passenger) => passenger.baggageInfo.paid).length;
  const unpaidOverweight = passengers.filter((passenger) => passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg && !passenger.baggageInfo.paid).length;
  const remainingSeats = Number.parseInt(flight.seats, 10) || 0;
  const booked = passengers.length;
  const totalPassenger = booked + remainingSeats;
  const progress = booked ? Math.round((checked.length / booked) * 100) : 0;

  return {
    booked,
    checked: checked.length,
    pending: booked - checked.length,
    business: business.length,
    economy: economy.length,
    businessChecked,
    economyChecked,
    pieces,
    kilograms,
    paidOverweight,
    unpaidOverweight,
    remainingSeats,
    totalPassenger,
    progress,
  };
}

function buildConnectionRows(flight: FlightRecord, passengers: Passenger[], inbound: boolean): FlightLegMatrixRow[] {
  const [from = "IST", to = "AMS"] = routeAirportCodes(flight.route);
  const seed = seededNumber(flight.code + (inbound ? "IN" : "OUT"));
  const destinations = inbound ? [from, "IST", to] : [to, "IST", from];
  const prefixes = inbound ? [1, 8, 6] : [18, 10, 19];
  return destinations.map((destination, index) => {
    const expectedC = Math.max(0, Math.min(3, Math.round(passengers.filter((passenger) => getPassengerCabin(passenger) === "business").length / 2) + index - 1));
    const expectedY = Math.max(1, passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").length + ((seed + index) % 4) - 1);
    const checkedC = Math.max(0, expectedC - ((seed + index) % 2));
    const checkedY = Math.max(0, expectedY - (index === 1 ? 2 : (seed + index) % 2));
    const shortY = Math.max(0, expectedY - checkedY);
    return {
      flight: `TK${String(prefixes[index] * 100 + ((seed + index * 17) % 90)).padStart(4, "0")}`,
      destination,
      time: index === 0 ? flight.boardingTime : index === 1 ? flight.arrivalTime : flight.announceTime,
      expected: [String(expectedC), String(expectedY), String((seed + index) % 2)],
      checked: [String(checkedC), String(checkedY), "0"],
      short: [String(Math.max(0, expectedC - checkedC)), String(shortY)],
      error: shortY > 2 ? "soft" : undefined,
    };
  });
}

function FiBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "yellow" | "red" }) {
  return <em className={`fi-badge ${tone}`}>{children}</em>;
}

function SourceTable({ columns, rows, widths, compact = false }: { columns: string[]; rows: Array<Array<ReactNode>>; widths?: string; compact?: boolean }) {
  return (
    <div className={`fi-source-table ${compact ? "compact" : ""}`.trim()} style={{ ["--fi-source-cols" as string]: widths ?? columns.map(() => "minmax(88px,1fr)").join(" ") }}>
      <div className="fi-source-row head">
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      {rows.map((row, rowIndex) => (
        <div className="fi-source-row" key={rowIndex}>
          {row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

const baggagePassengerColumns = ["Yolcu Adı", "Şehir", "Pool ID", "Bagaj Hakkı", "Verilen Ba...", "Fark", "Özellikli B...", "Action"];

function createBaggagePassengerRows(passengers: Passenger[]): BaggagePassengerListRow[] {
  const toRow = (passenger: Passenger, index: number, poolId = passenger.group): BaggagePassengerListRow => {
    const diff = passenger.baggageInfo.allowanceKg - passenger.baggageInfo.kg;
    return {
      id: `${passenger.pnr}-${index}`,
      name: passengerFullName(passenger),
      city: passenger.surname.charAt(0) < "M" ? "Istanbul" : "Ankara",
      poolId,
      allowance: `${passenger.baggageInfo.pieces} pc /${passenger.baggageInfo.allowanceKg} kg`,
      issued: String(passenger.baggageInfo.kg),
      diff: String(diff),
      special: passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg ? "OVER - KG" : "0",
      commentTone: passenger.message > 0 ? "success" : "muted",
      action: passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg && !passenger.baggageInfo.paid ? "pay" : undefined,
    };
  };

  if (passengers.length < 3) return passengers.map((passenger, index) => toRow(passenger, index));

  const poolId = passengers[0].group;
  return [
    {
      ...toRow(passengers[0], 0, poolId),
      id: `${passengers[0].pnr}-hop`,
      isHead: true,
      children: passengers.slice(1, 3).map((passenger, index) => toRow(passenger, index + 1, poolId)),
    },
    ...passengers.slice(3).map((passenger, index) => toRow(passenger, index + 3)),
  ];
}

function BaggagePassengerList({ rows }: { rows: BaggagePassengerListRow[] }) {
  const [expandedPools, setExpandedPools] = useState<Set<string>>(() => new Set(rows.filter((row) => row.children?.length).map((row) => row.id)));
  const [query, setQuery] = useState("");
  const [showHeadsOnly, setShowHeadsOnly] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    setExpandedPools(new Set(rows.filter((row) => row.children?.length).map((row) => row.id)));
    setQuery("");
    setShowHeadsOnly(false);
  }, [rows]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (showHeadsOnly && !row.isHead) return false;
      if (!normalizedQuery) return true;
      const haystack = [row.name, row.city, row.poolId, ...(row.children ?? []).flatMap((child) => [child.name, child.city, child.poolId])].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, rows, showHeadsOnly]);

  const togglePool = (poolId: string) => {
    setExpandedPools((current) => {
      const next = new Set(current);
      if (next.has(poolId)) next.delete(poolId);
      else next.add(poolId);
      return next;
    });
  };

  const renderRow = (row: BaggagePassengerListRow, level: "head" | "child" | "single") => {
    const hasChildren = Boolean(row.children?.length);
    const expanded = expandedPools.has(row.id);
    return (
      <div className={`fi-baggage-passenger-row ${level} ${row.isHead ? "hop" : ""}`.trim()} role="row" key={row.id}>
        <span className="fi-baggage-passenger-name" role="cell">
          {hasChildren ? (
            <button type="button" aria-label={`${row.name} HoP yolcularını ${expanded ? "kapat" : "aç"}`} aria-expanded={expanded} onClick={() => togglePool(row.id)}>
              <Icon icon={expanded ? "keyboard_arrow_down" : "chevron_right"} size={20} />
            </button>
          ) : (
            <i aria-hidden="true" />
          )}
          <span>
            <strong>{row.name}</strong>
            {row.isHead && <em>HoP</em>}
          </span>
        </span>
        <span role="cell">{row.city}</span>
        <span role="cell">{row.poolId}</span>
        <span role="cell">{row.allowance}</span>
        <span role="cell" className={Number(row.issued) < 0 ? "negative" : ""}>{row.issued}</span>
        <span role="cell">{row.diff}</span>
        <span role="cell">{row.special}</span>
        <span className="fi-baggage-passenger-action" role="cell">
          {row.action === "pay" ? <button type="button" className="fi-pay-action">Pay Now</button> : <Icon icon="chat" size={18} className={row.commentTone === "success" ? "success" : ""} fill />}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="fi-passenger-tools">
        <label><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type name, pool number..." aria-label="Yolcu ara" /><Icon icon="search" size={18} /></label>
        <div className="fi-segmented-tabs small" role="tablist" aria-label="Yolcu liste filtresi">
          <button className={!showHeadsOnly ? "active" : ""} type="button" role="tab" aria-selected={!showHeadsOnly} onClick={() => setShowHeadsOnly(false)}>Tümü</button>
          <button className={showHeadsOnly ? "active" : ""} type="button" role="tab" aria-selected={showHeadsOnly} onClick={() => setShowHeadsOnly(true)}>Head of Pool’s</button>
        </div>
        <button type="button"><Icon icon="filter_list" size={17} />Over Allowence</button>
      </div>
      <div className="fi-baggage-passenger-list" role="table" aria-label="Bagaj yolcu listesi">
        <div className="fi-baggage-passenger-head" role="row">
          {baggagePassengerColumns.map((column) => <span role="columnheader" key={column}>{column}</span>)}
        </div>
        {visibleRows.map((row) => {
          const isExpanded = expandedPools.has(row.id);
          return (
            <div className="fi-baggage-passenger-group" key={row.id}>
              {renderRow(row, row.isHead ? "head" : "single")}
              {row.children && isExpanded && row.children.map((child) => renderRow(child, "child"))}
            </div>
          );
        })}
      </div>
    </>
  );
}

function FlightInfoProgress({ label, value, max, right, tone = "blue" }: { label: string; value: number; max: number; right: string; tone?: "blue" | "yellow" | "green" }) {
  const width = Math.min(100, Math.round((value / max) * 100));
  return <div className="fi-progress"><div><span>{label}</span><b>{right}</b></div><i><em className={tone} style={{ width: `${width}%` }} /></i></div>;
}

const baggagePropertyRows = [
  ["Standart", "4"],
  ["Kabin El Bagajı", "15"],
  ["Zemzem", "1"],
  ["Bebek Arabası", "0"],
  ["Tekerlekli Sandalye", "0"],
] as const;

type BaggagePassengerListRow = {
  id: string;
  name: string;
  city: string;
  poolId: string;
  allowance: string;
  issued: string;
  diff: string;
  special: string;
  commentTone: "muted" | "success";
  action?: "pay";
  isHead?: boolean;
  children?: BaggagePassengerListRow[];
};

type FlightLegMatrixRow = {
  flight: string;
  destination: string;
  time: string;
  expected: [string, string, string];
  checked: [string, string, string];
  short: [string, string];
  error?: "soft" | "strong";
};

const outInFlightRows: FlightLegMatrixRow[] = [
  { flight: "TK1872", destination: "VCE", time: "19:30", expected: ["0", "1", "0"], checked: ["BC", "0", "0"], short: ["0", "0"] },
  { flight: "TK1806", destination: "TLS", time: "23:45", expected: ["0", "2", "0"], checked: ["BW", "0", "0"], short: ["0", "0"] },
  { flight: "TK1126", destination: "AMS", time: "17:45", expected: ["2", "0", "0"], checked: ["0", "0", "0"], short: ["0", "0"], error: "soft" },
  { flight: "TK1952", destination: "CMN", time: "23:25", expected: ["1", "6", "0"], checked: ["1", "2", "0"], short: ["0", "0"] },
  { flight: "TK0618", destination: "SOF", time: "18:30", expected: ["0", "2", "0"], checked: ["0", "0", "0"], short: ["0", "0"], error: "strong" },
  { flight: "TK1032", destination: "ZRH", time: "23:15", expected: ["0", "2", "0"], checked: ["0", "0", "0"], short: ["0", "0"] },
];

const inboundFlightRows: FlightLegMatrixRow[] = [
  { flight: "TK1872", destination: "VCE", time: "19:30", expected: ["0", "1", "0"], checked: ["BC", "0", "0"], short: ["0", "0"] },
  { flight: "TK1806", destination: "TLS", time: "23:45", expected: ["0", "2", "0"], checked: ["BW", "0", "0"], short: ["0", "0"] },
  { flight: "TK1126", destination: "AMS", time: "17:45", expected: ["2", "0", "0"], checked: ["0", "0", "0"], short: ["0", "0"], error: "soft" },
  { flight: "TK1952", destination: "CMN", time: "23:25", expected: ["1", "6", "0"], checked: ["1", "2", "0"], short: ["0", "0"] },
  { flight: "TK0618", destination: "SOF", time: "18:30", expected: ["0", "2", "0"], checked: ["0", "0", "0"], short: ["0", "0"], error: "strong" },
  { flight: "TK1032", destination: "ZRH", time: "23:15", expected: ["0", "2", "0"], checked: ["0", "0", "0"], short: ["0", "0"] },
];

function FlightMiniStats({ columns, rows }: { columns: string[]; rows: Array<{ label: string; values: string[]; error?: boolean }> }) {
  return (
    <div className="fi-mini-stats" style={{ ["--fi-mini-cols" as string]: `minmax(92px,1fr) repeat(${columns.length}, minmax(36px,1fr))` }}>
      <div className="fi-mini-stats-head">
        <span>Sınıf</span>
        {columns.map((column) => <span key={column}>{column}</span>)}
      </div>
      {rows.map((row) => (
        <div className={`fi-mini-stats-row ${row.error ? "error" : ""}`.trim()} key={row.label}>
          <span>{row.label}</span>
          {row.values.map((value, index) => <span key={`${row.label}-${index}`}>{value}</span>)}
        </div>
      ))}
    </div>
  );
}

function FlightInfoCompactMatrix({ columns, rows }: { columns: string[]; rows: Array<{ label: string; values: string[] }> }) {
  return (
    <div className="fi-compact-matrix" role="table" style={{ ["--fi-compact-cols" as string]: `minmax(160px,1fr) repeat(${columns.length}, 72px)` }}>
      <div className="fi-compact-matrix-head" role="row">
        <span>Sınıf</span>
        {columns.map((column, index) => <span key={`${column}-${index}`}>{column}</span>)}
      </div>
      {rows.map((row) => (
        <div className="fi-compact-matrix-row" role="row" key={row.label}>
          <span>{row.label}</span>
          {row.values.map((value, index) => <span key={`${row.label}-${index}`}>{value}</span>)}
        </div>
      ))}
    </div>
  );
}

function FlightLegMatrix({ rows }: { rows: FlightLegMatrixRow[] }) {
  const renderCell = (value: ReactNode, row: FlightLegMatrixRow, className = "", key?: string) => (
    <span key={key} className={`${className} ${row.error ? `error ${row.error}` : ""}`.trim()}>{value}</span>
  );
  const renderFlightCode = (row: FlightLegMatrixRow) => {
    const content = <span className="fi-flight-error-trigger"><Icon icon="error" size={20} fill />{row.flight}</span>;
    if (!row.error) return renderCell(row.flight, row, "flight-code");
    return renderCell(
      createElement(
        "tk-tooltip",
        {
          variant: "dark",
          position: "top-start",
          header: row.error === "strong" ? "Critical connection warning" : "Connection warning",
          description: row.error === "strong" ? "This flight has a blocking inbound/outbound mismatch." : "Review expected and checked-in values before proceeding.",
        },
        <span slot="trigger">{content}</span>,
      ),
      row,
      "flight-code",
    );
  };

  return (
    <div className="fi-flight-matrix" role="table" aria-label="Uçuş listesi">
      <div className="fi-flight-matrix-groups" role="row">
        <span className="single">Uçuş No</span>
        <span className="single">Varış</span>
        <span className="single">Saat</span>
        <span>Beklenen</span>
        <span>Check-in</span>
        <span>Short</span>
      </div>
      <div className="fi-flight-matrix-subheads" role="row">
        <span />
        <span />
        <span />
        <span>C</span><span>Y</span><span>INF</span>
        <span>C</span><span>Y</span><span>INF</span>
        <span>BC</span><span>BW</span>
      </div>
      {rows.map((row) => (
        <div className={`fi-flight-matrix-row ${row.error ? `error ${row.error}` : ""}`.trim()} role="row" key={row.flight}>
          {renderFlightCode(row)}
          {renderCell(row.destination, row)}
          {renderCell(row.time, row)}
          {row.expected.map((value, index) => renderCell(value, row, `subcell expected-${index}`, `expected-${index}`))}
          {row.checked.map((value, index) => renderCell(value, row, `subcell checked-${index}`, `checked-${index}`))}
          {row.short.map((value, index) => renderCell(value, row, `subcell short-${index}`, `short-${index}`))}
        </div>
      ))}
    </div>
  );
}

function FlightInfoGeneralTab({ flight, passengers }: { flight: FlightRecord; passengers: Passenger[] }) {
  const stats = getFlightStats(flight, passengers);
  const male = passengers.filter((passenger) => inferPassengerGenderFromName(passenger.name) === "male").length;
  const female = passengers.length - male;
  const businessAvailable = Math.max(0, Math.round(stats.remainingSeats * 0.18));
  const economyAvailable = Math.max(0, stats.remainingSeats - businessAvailable);
  const verified = passengers.filter((passenger) => passenger.apis === "filled").length;
  const unverified = passengers.length - verified;

  return (
    <div className="fi-source-flow fi-flight-info-source">
      <FlightInfoTopActions />
      <div className="fi-reference-grid two">
        <FlightInfoSourceCard title="Boarded Yolcu Sayısı" icon="flight">
          <FlightInfoMetric label="Boarded" value={String(stats.checked)} total={String(stats.booked)} remaining={`${stats.pending} Kalan`} progress={stats.progress} />
          <SourceTable columns={["Kategori", "C", "Y"]} rows={[["Checked-in", String(stats.businessChecked), String(stats.economyChecked)], ["Booked", String(stats.business), String(stats.economy)], ["Infant", "0", String(Math.max(0, Math.floor(stats.economy / 6)))], ["Ön Kontrol", String(Math.max(0, stats.business - stats.businessChecked)), String(Math.max(0, stats.economy - stats.economyChecked))]]} compact />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="Uçuş Özeti" icon="flight">
          <SourceTable columns={["Sınıf", "C", "Y"]} rows={[["Available", String(businessAvailable), String(economyAvailable)], ["Booked", String(stats.business), String(stats.economy)], ["Accepted", String(stats.businessChecked), String(stats.economyChecked)], ["On STB", "0", String(Math.max(0, stats.pending - 1))], ["Z Bloke", String(stats.unpaidOverweight), "0"]]} compact />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="Yolcu İstatistikleri" icon="person">
          <SourceTable columns={["Sınıf", "C", "Y"]} rows={[["Male", String(Math.min(male, stats.business)), String(Math.max(0, male - stats.business))], ["Female", String(Math.max(0, stats.business - Math.min(male, stats.business))), String(Math.max(0, female - Math.max(0, stats.business - Math.min(male, stats.business))))], ["Child", "0", String(Math.max(0, Math.floor(stats.booked / 8)))], ["Infant", "0", String(Math.max(0, Math.floor(stats.booked / 10)))]]} compact />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="Kapasite Bilgisi" icon="groups">
          <SourceTable columns={["Sınıf", "C", "Y"]} rows={[[`Kapasite / Doluluk (${stats.totalPassenger})`, String(stats.business + businessAvailable), String(stats.economy + economyAvailable)], ["Giden (Transfer From)", String(Math.floor(stats.business / 3)), String(Math.floor(stats.economy / 4))], ["Giden (Transfer To)", String(Math.floor(stats.business / 4)), String(Math.floor(stats.economy / 5))], ["Real Availability", String(businessAvailable), String(economyAvailable)]]} compact />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="Doğrulanmamış Yolcu Sayısı" icon="manage_accounts">
          <SourceTable columns={["Sınıf", "C", "Y"]} rows={[["Toplam", String(stats.business), String(stats.economy)], ["Doğrulanmış", String(Math.min(verified, stats.business)), String(Math.max(0, verified - stats.business))], ["Doğrulanmamış", String(Math.max(0, stats.business - Math.min(verified, stats.business))), String(Math.max(0, unverified - Math.max(0, stats.business - Math.min(verified, stats.business))))]]} compact />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="Bagaj İstatistikleri" icon="luggage">
          <SourceTable columns={["Sınıf", "C", "Y"]} rows={[["Piece", String(passengers.filter((passenger) => getPassengerCabin(passenger) === "business").reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0)), String(passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0))], ["Weight", String(passengers.filter((passenger) => getPassengerCabin(passenger) === "business").reduce((sum, passenger) => sum + passenger.baggageInfo.kg, 0)), String(passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").reduce((sum, passenger) => sum + passenger.baggageInfo.kg, 0))]]} compact />
        </FlightInfoSourceCard>
      </div>
    </div>
  );
}

function InboundOutboundTab({ flight, passengers }: { flight: FlightRecord; passengers: Passenger[] }) {
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const isInbound = direction === "inbound";
  const stats = getFlightStats(flight, passengers);
  const businessBags = passengers.filter((passenger) => getPassengerCabin(passenger) === "business").reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0);
  const economyBags = passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0);
  const businessWeight = passengers.filter((passenger) => getPassengerCabin(passenger) === "business").reduce((sum, passenger) => sum + passenger.baggageInfo.kg, 0);
  const economyWeight = passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").reduce((sum, passenger) => sum + passenger.baggageInfo.kg, 0);
  const connectionRows = buildConnectionRows(flight, passengers, isInbound);

  return (
    <div className="fi-source-flow fi-inout-source">
      <FlightInfoTopActions>
        <div className="fi-source-switch" role="tablist" aria-label="Inbound outbound tabs">
          <button className={!isInbound ? "active" : ""} type="button" role="tab" aria-selected={!isInbound} onClick={() => setDirection("outbound")}>Outbound</button>
          <button className={isInbound ? "active" : ""} type="button" role="tab" aria-selected={isInbound} onClick={() => setDirection("inbound")}>Inbound</button>
        </div>
      </FlightInfoTopActions>
      <div className="fi-inout-layout">
        <div className="fi-inout-side">
          <FlightInfoSourceCard title="Yolcu Sayısı" icon="person" className="fi-inout-summary-card">
            <FlightInfoMetric label="Checked-in" value={String(stats.checked)} total={String(stats.booked)} remaining={`${stats.pending} Kalan`} progress={stats.progress} caption={`Checked-in ${stats.checked}`} />
            <FlightMiniStats columns={["Beklenen", "Checked-in", "Infant"]} rows={[{ label: "Business (C)", values: [String(stats.business), String(stats.businessChecked), "0"] }, { label: "Economy (Y)", values: [String(stats.economy), String(stats.economyChecked), String(Math.floor(stats.economy / 6))] }]} />
          </FlightInfoSourceCard>
          <FlightInfoSourceCard title="Bagaj Sayısı" icon="luggage" className="fi-inout-summary-card">
            <FlightInfoKpiPair items={[{ value: String(stats.pieces), label: "Toplam Bagaj" }, { value: String(stats.kilograms), suffix: "kg", label: "Toplam Ağırlık" }]} />
            <FlightMiniStats columns={["Adet", "Ağırlık (kg)"]} rows={[{ label: "Business (C)", values: [String(businessBags), String(businessWeight)] }, { label: "Economy (Y)", values: [String(economyBags), String(economyWeight)] }]} />
          </FlightInfoSourceCard>
        </div>
        <FlightInfoSourceCard title={`${isInbound ? "Inbound" : "Outbound"} Uçuş Listesi`} icon={isInbound ? "flight_land" : "flight_takeoff"} className="fi-inout-list">
          <div className="fi-inout-search-row">
            <strong>Ayrıntılı Arama</strong>
            <div>
              <button type="button">Uçuş Türü <Icon icon="keyboard_arrow_down" size={20} /></button>
              <button type="button">Varış Noktası <Icon icon="keyboard_arrow_down" size={20} /></button>
            </div>
          </div>
          <FlightLegMatrix rows={connectionRows} />
        </FlightInfoSourceCard>
      </div>
    </div>
  );
}

function EmdEbitTab({ passengers, embedded = false }: { passengers: Passenger[]; embedded?: boolean }) {
  const stats = getFlightStats({ code: "TEMP", route: "IST  ›  AMS", time: "", state: "FO", tone: "green", gate: "", boardingTime: "", arrivalTime: "", seats: "0", regNo: "", announceTime: "" }, passengers);
  const businessPaid = passengers.filter((passenger) => getPassengerCabin(passenger) === "business" && passenger.baggageInfo.paid).length;
  const economyPaid = passengers.filter((passenger) => getPassengerCabin(passenger) === "economy" && passenger.baggageInfo.paid).length;
  const businessNoEmd = passengers.filter((passenger) => getPassengerCabin(passenger) === "business" && passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg && !passenger.baggageInfo.paid).length;
  const economyNoEmd = passengers.filter((passenger) => getPassengerCabin(passenger) === "economy" && passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg && !passenger.baggageInfo.paid).length;

  return (
    <div className={`fi-source-flow fi-emd-source ${embedded ? "embedded" : ""}`.trim()}>
      {!embedded && <FlightInfoTopActions />}
      <div className="fi-reference-grid three fi-emd-summary-grid">
        <FlightInfoSourceCard title="Ekstra Bagaj" icon="luggage">
          <FlightInfoKpiPair items={[{ value: String(stats.pieces), label: "Toplam Bagaj" }, { value: String(stats.kilograms), suffix: "kg", label: "Toplam Ağırlık" }]} />
          <FlightMiniStats columns={["Piece", "Ağırlık (kg)"]} rows={[{ label: "Business (C)", values: [String(passengers.filter((passenger) => getPassengerCabin(passenger) === "business").reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0)), String(passengers.filter((passenger) => getPassengerCabin(passenger) === "business").reduce((sum, passenger) => sum + passenger.baggageInfo.kg, 0))] }, { label: "Economy (Y)", values: [String(passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0)), String(passengers.filter((passenger) => getPassengerCabin(passenger) === "economy").reduce((sum, passenger) => sum + passenger.baggageInfo.kg, 0))] }]} />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="EMD" icon="receipt_long">
          <FlightInfoSubsectionMetrics title="EMD" items={[{ value: String(businessPaid), label: "Total Business EMD" }, { value: String(economyPaid), label: "Total Economy EMD" }]} />
          <FlightInfoSubsectionMetrics title="No-Emd" items={[{ value: String(businessNoEmd), label: "Business No-EMD" }, { value: String(economyNoEmd), label: "Economy No-EMD" }]} />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="E-Tkt" icon="receipt_long">
          <FlightInfoSubsectionMetrics title="Total E-Tkt" items={[{ value: String(stats.business), label: "Business (C)" }, { value: String(stats.economy), label: "Economy (Y)" }]} />
          <FlightInfoSubsectionMetrics title="No Total E-Tkt" items={[{ value: String(Math.max(0, stats.business - stats.businessChecked)), label: "Business (C)" }, { value: String(Math.max(0, stats.economy - stats.economyChecked)), label: "Economy (Y)" }]} />
        </FlightInfoSourceCard>
      </div>
      <div className="fi-reference-grid two">
        <FlightInfoSourceCard title="EMD Tablosu" icon="table_chart">
          <FlightInfoCompactMatrix columns={["C", "Y", "C", "Y"]} rows={[
            { label: "Booked", values: [String(stats.business), String(stats.economy), String(stats.business), String(stats.economy)] },
            { label: "Accepted", values: [String(stats.businessChecked), String(stats.economyChecked), String(businessPaid), String(economyPaid)] },
            { label: "No Show", values: [String(Math.max(0, stats.business - stats.businessChecked)), String(Math.max(0, stats.economy - stats.economyChecked)), String(businessNoEmd), String(economyNoEmd)] },
            { label: "STA NOK", values: [String(businessNoEmd), String(economyNoEmd), String(stats.unpaidOverweight), "0"] },
            { label: "Jumpseat", values: ["0", "0", "0", "0"] },
          ]} />
        </FlightInfoSourceCard>
        <FlightInfoSourceCard title="E-TKT Tablosu" icon="confirmation_number">
          <FlightInfoCompactMatrix columns={["C", "Y"]} rows={[
            { label: "Booked", values: [String(stats.business), String(stats.economy)] },
            { label: "Accepted", values: [String(stats.businessChecked), String(stats.economyChecked)] },
            { label: "No Show", values: [String(Math.max(0, stats.business - stats.businessChecked)), String(Math.max(0, stats.economy - stats.economyChecked))] },
            { label: "STA NOK", values: [String(businessNoEmd), String(economyNoEmd)] },
            { label: "Jumpseat", values: ["0", "0"] },
          ]} />
        </FlightInfoSourceCard>
      </div>
    </div>
  );
}

function BaggageInfoTab({ flight, passengers }: { flight: FlightRecord; passengers: Passenger[] }) {
  const standardBags = passengers.reduce((sum, passenger) => sum + passenger.baggageInfo.pieces, 0);
  const cabinBags = Math.max(1, Math.floor(passengers.length / 2));
  const overweight = passengers.filter((passenger) => passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg).length;
  const baggageRows = createBaggagePassengerRows(passengers);
  const chartBars = [
    { label: "Std", value: standardBags, strong: true },
    { label: "Over", value: overweight },
    { label: "Cabin", value: cabinBags },
    { label: "Paid", value: passengers.filter((passenger) => passenger.baggageInfo.paid).length },
    { label: "Msg", value: passengers.filter((passenger) => passenger.message > 0).length },
    { label: "Elite", value: passengers.filter((passenger) => passenger.tier === "Elite").length },
    { label: "Classic", value: passengers.filter((passenger) => passenger.tier === "Classic").length },
    { label: "APIS", value: passengers.filter((passenger) => passenger.apis === "filled").length },
    { label: "NoRec", value: passengers.filter((passenger) => passenger.pnr === "NO REC").length },
  ];

  return (
    <div className="fi-source-flow baggage-source">
      <FlightInfoSourceCard title={flight.code} icon="flight" className="fi-baggage-feature" menu={false}>
        <div className="fi-baggage-feature-body">
          <div className="fi-baggage-property-table">
            <SourceTable columns={["Bagaj Özelliği", "Adet"]} rows={[
              ["Standart", String(standardBags)],
              ["Kabin El Bagajı", String(cabinBags)],
              ["Fazla Bagaj", String(overweight)],
              ["Ödenmiş EMD", String(passengers.filter((passenger) => passenger.baggageInfo.paid).length)],
            ].map(([name, value]) => [<span className="fi-with-icon"><Icon icon="flight" size={17} />{name}</span>, value])} widths="minmax(260px,1fr) 92px" compact />
          </div>
          <div className="fi-baggage-chart" aria-label="Bagaj özellikleri grafiği">
            <div className="fi-chart-axis"><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span></div>
            {chartBars.map((bar) => (
              <div className="fi-chart-bar" key={bar.label + bar.value} style={{ ["--bar" as string]: `${Math.max(8, bar.value * 10)}%` }}>
                <i className={bar.strong ? "strong" : ""}>{bar.strong ? bar.value : ""}</i><span>{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </FlightInfoSourceCard>
      <FlightInfoSourceCard title="Yolcu Listesi" icon="groups">
        <BaggagePassengerList rows={baggageRows} />
      </FlightInfoSourceCard>
    </div>
  );
}

function OperationsTab({ flight }: { flight: FlightRecord }) {
  const rows = [
    { item: "Boarding", owner: "Gate", time: flight.boardingTime, state: "Ready" },
    { item: "Catering", owner: "Ramp", time: flight.announceTime, state: "Completed" },
    { item: "Fuel", owner: "Ops", time: flight.announceTime, state: "Completed" },
    { item: "Load Sheet", owner: "DCS", time: flight.arrivalTime, state: flight.tone === "yellow" ? "Waiting" : "Ready" },
  ];

  return (
    <div className="fi-paper-stack">
      <FlightInfoPanel title="Uçuş Operasyon" icon="bolt">
        <SourceTable columns={["Operasyon", "Owner", "Time", "Status"]} rows={rows.map((row) => [row.item, row.owner, row.time, <FiBadge tone={row.state === "Waiting" ? "yellow" : "green"}>{row.state}</FiBadge>])} />
      </FlightInfoPanel>
    </div>
  );
}

function RegNoFlightsTab({ flight }: { flight: FlightRecord }) {
  const [from = "IST", to = "AMS"] = routeAirportCodes(flight.route);
  const multiLegStops = flight.multiLeg?.legs.map((leg, index) => {
    const [legFrom = from, legTo = to] = leg.label.split("-").map((part) => part.trim());
    return index === 0 ? [legFrom, legTo] : [legTo];
  }).flat();
  const stopCodes = multiLegStops?.length ? Array.from(new Set(multiLegStops)) : [from, to];
  const routeStops = stopCodes.map((code, index) => ({
    code,
    time: index === 0 ? flight.boardingTime : index === stopCodes.length - 1 ? flight.arrivalTime : flight.announceTime,
    active: index < stopCodes.length - 1 || flight.tone === "green",
  }));
  const aircraft = flight.regNo.split("/")[0].trim();
  const legRows = routeStops.slice(0, -1).map((stop, index) => {
    const nextStop = routeStops[index + 1];
    return [
      index === 0 ? flight.code : `TK${String((seededNumber(flight.code + stop.code) % 8000) + 1000).padStart(4, "0")}`,
      stop.code,
      nextStop.code,
      stop.time,
      nextStop.time,
      aircraft,
    ];
  });

  return (
    <div className="fi-source-flow fi-regno-source">
      <FlightInfoSourceCard
        title="Route Timeline"
        icon="groups"
        action={<button type="button" className="fi-source-header-button"><span>{aircraft}</span><Icon icon="refresh" size={20} /></button>}
      >
        <div className="fi-reg-route" aria-label="Route timeline">
          {routeStops.map((stop, index) => (
            <div className={`fi-reg-route-step ${stop.active ? "active" : ""}`.trim()} key={stop.code}>
              <div className="fi-reg-route-line-wrap">
                <span className="fi-reg-route-dot" aria-hidden="true"><i /></span>
                {index < routeStops.length - 1 && <b aria-hidden="true" />}
              </div>
              <div className="fi-reg-route-label">
                <strong>{stop.code}</strong>
                <span>{stop.time}</span>
              </div>
            </div>
          ))}
        </div>
      </FlightInfoSourceCard>
      <FlightInfoSourceCard
        title="Flight Legs"
        icon="groups"
        action={<button type="button" className="fi-source-header-button"><span>Print</span><Icon icon="print" size={20} /></button>}
      >
        <SourceTable
          columns={["Flight", "From", "To", "Departure", "Arrival", "Aircraft"]}
          rows={legRows}
          widths="minmax(160px,1fr) minmax(140px,1fr) minmax(140px,1fr) minmax(150px,1fr) minmax(150px,1fr) minmax(150px,1fr)"
        />
      </FlightInfoSourceCard>
    </div>
  );
}

type AvatarGender = "male" | "female";
type AvatarState = "active" | "danger" | "muted" | "selected" | "head";
type AvatarSize = "sm" | "md" | "lg";
type AvatarAge = "adult" | "young" | "child";
type AvatarKind = "man" | "woman" | "young-man" | "young-woman" | "child-boy" | "child-girl";

function getAvatarGender(type: string): AvatarGender {
  return type.includes("woman") || type.includes("girl") || type.includes("female") ? "female" : "male";
}

function getAvatarAge(type: string): AvatarAge {
  if (type.includes("child")) return "child";
  if (type.includes("young")) return "young";
  return "adult";
}

function getAvatarKind(gender: AvatarGender, age: AvatarAge): AvatarKind {
  if (age === "child") return gender === "female" ? "child-girl" : "child-boy";
  if (age === "young") return gender === "female" ? "young-woman" : "young-man";
  return gender === "female" ? "woman" : "man";
}

function getAvatarState(type: string): AvatarState {
  if (type.includes("dark") || type.includes("alt")) return "muted";
  return "active";
}

function Avatar({
  type,
  gender,
  state,
  size = "sm",
}: {
  type: string;
  gender?: AvatarGender;
  state?: AvatarState;
  size?: AvatarSize;
}) {
  const resolvedGender = gender ?? getAvatarGender(type);
  const resolvedKind = getAvatarKind(resolvedGender, getAvatarAge(type));
  const resolvedState = state ?? getAvatarState(type);

  return (
    <span
      className={`avatar avatar-gender-${resolvedGender} avatar-kind-${resolvedKind} avatar-state-${resolvedState} avatar-size-${size}`}
      aria-hidden="true"
    >
      <svg className="avatar-svg" viewBox="0 0 20 20" width="20" height="20" focusable="false">
        {resolvedGender === "female" ? (
          <>
            <path className="avatar-hair" d="M4.7 11.9c-1.1-.7-.9-1.7-.7-2.3.2-.6-.4-1-.2-1.9.2-.9 1-.9 1.1-2 .2-2.3 2.2-4 4.6-4 2.7 0 4.7 1.9 4.8 4.4.1 1.1.9 1.3.9 2.2 0 .8-.5 1.2-.4 1.9.1.7.2 1.4-.7 1.9H4.7Z" />
            <path className="avatar-face" d="M7.1 11.1V8.7c-1.2-.2-1.1-2 .1-1.6.4.1.8-.5.8-1.1 1.3 1 3.6-.7 4.1.8.4 1.4-.1 3.6-1.8 3.9v.7c.7.4 1.5.8 2.4 1.1-.7 1-1.9 1.7-3.2 1.7-1.4 0-2.6-.7-3.3-1.8.4-.2.7-.4.9-.6Z" />
            <path className="avatar-shirt" d="M3.4 18c.3-2.5.8-4 1.6-4.7.4-.3 1.4-.8 2.1-1.2.6.6 1.4.9 2.4.9s1.8-.3 2.4-.9c.8.4 1.8.9 2.2 1.2.8.7 1.3 2.2 1.6 4.7H3.4Z" />
            <path className="avatar-accent" d="M7.6 4.8c.9-.7 2-.7 3.2 0 .2-.4.5-.6.9-.6.8 0 .9 1.2.1 1.4-.4.1-.8-.1-1-.4-1 .5-1.9.5-2.9 0-.2.3-.6.5-1 .4-.8-.2-.7-1.4.1-1.4.3 0 .5.2.6.6Z" />
          </>
        ) : (
          <>
            <path className="avatar-hair" d="M5.1 8.3c-.8-2.9.8-5.7 4.7-5.9 3.9-.1 5.3 2.6 4.5 5.8l-1.1 2.6H6.2L5.1 8.3Z" />
            <path className="avatar-face" d="M7.3 11.1V8.8c-1.1-.2-1.1-1.8.1-1.5.5.1.9-.4 1-1.2 1.5 1.2 3.4-.2 4.2.7.2 1.9-.4 3.6-2 3.9v.8c.5.4 1.3.8 2.3 1.2-.8.9-1.9 1.4-3.2 1.4-1.4 0-2.5-.6-3.3-1.5.4-.2.7-.4.9-.6Z" />
            <path className="avatar-shirt" d="M2.7 18c.4-2.5.9-4 1.6-4.7.5-.5 2.1-1.1 3-1.5.5.7 1.3 1.1 2.4 1.1 1 0 1.8-.4 2.3-1.1.9.4 2.6 1 3.1 1.5.7.7 1.2 2.2 1.6 4.7H2.7Z" />
            <path className="avatar-accent" d="M8.1 12.2h3.2l-.8 4.8h-1.6l-.8-4.8Z" />
          </>
        )}
      </svg>
    </span>
  );
}

function passengerFullName(passenger: Passenger) {
  return `${passenger.name} ${passenger.surname.charAt(0) + passenger.surname.slice(1).toLowerCase()}`;
}

function getPoolMetrics(passengers: Passenger[]) {
  const pieces = passengers.reduce((total, passenger) => total + passenger.baggageInfo.pieces, 0);
  const kilograms = passengers.reduce((total, passenger) => total + passenger.baggageInfo.kg, 0);
  const allowanceKg = passengers.reduce((total, passenger) => total + passenger.baggageInfo.allowanceKg, 0);
  const overweightPassengers = passengers.filter((passenger) => passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg);
  return {
    pieces,
    kilograms,
    allowanceKg,
    excessKg: Math.max(0, kilograms - allowanceKg),
    overweightPassengers,
    isOverweight: kilograms > allowanceKg || overweightPassengers.length > 0,
  };
}

function formatEuro(amount: number) {
  return `€${amount.toFixed(2).replace(".", ",")}`;
}

function getPoolChargeMetrics(passengers: Passenger[], bagCount: number, paymentCompleted: boolean) {
  const poolMetrics = getPoolMetrics(passengers);
  const baggageLimitKg = 69;
  const includedBags = passengers.length;
  const totalBagCount = Math.max(0, bagCount);
  const extraPieceCount = Math.max(0, totalBagCount - includedBags);
  const addedPieceWeightKg = extraPieceCount * 10;
  const totalWeightKg = poolMetrics.kilograms + addedPieceWeightKg;
  const overweightKg = Math.max(0, totalWeightKg - baggageLimitKg);
  const extraPiecePrice = extraPieceCount * 125;
  const extraWeightKg = overweightKg;
  const extraWeightPrice = extraWeightKg > 0 ? Math.ceil(extraWeightKg / 10) * 125 : 0;
  const totalPaid = paymentCompleted ? extraPiecePrice + extraWeightPrice : 0;
  const isOverweight = totalWeightKg > baggageLimitKg;
  const displayAllowanceKg = paymentCompleted && isOverweight ? totalWeightKg : baggageLimitKg;
  const progressTone = paymentCompleted ? "paid" : isOverweight ? "overweight" : "default";

  return {
    ...poolMetrics,
    kilograms: totalWeightKg,
    includedBags,
    pieces: totalBagCount,
    extraPieceCount,
    extraWeightKg,
    addedPieceWeightKg,
    overweightKg,
    extraPiecePrice,
    extraWeightPrice,
    totalPaid,
    displayAllowanceKg,
    progressTone,
    baggageLimitKg,
    isOverweight,
    helperText: `${includedBags} bags included. You can add more if needed`,
  };
}

function PassengerSelectionBar({
  selectedPassengers,
  onRemove,
  onClear,
  onCheckInAll,
  onCreatePool,
  mode,
  onUndo,
}: {
  selectedPassengers: Passenger[];
  onRemove: (passenger: Passenger) => void;
  onClear: () => void;
  onCheckInAll: () => void;
  onCreatePool: () => void;
  mode: "selection" | "checkin-completed" | "pool-success" | "pool-error";
  onUndo: () => void;
}) {
  if (selectedPassengers.length === 0) return null;
  const poolMetrics = getPoolMetrics(selectedPassengers);

  if (mode !== "selection") {
    const passengerNames = selectedPassengers.slice(0, 3).map(passengerFullName).join(", ");
    const isPoolError = mode === "pool-error";
    const isPoolSuccess = mode === "pool-success";

    return (
      <div className={`passenger-selection-bar completed ${isPoolError ? "error" : ""}`} role="status" aria-live="polite">
        <div className="completed-message">
          <span className="completed-icon"><Icon icon={isPoolError ? "error" : "check_circle"} size={24} fill /></span>
          <span>{mode === "checkin-completed" ? "Check-in completed successfully" : isPoolSuccess ? "Pool created successfully" : "Pool could not be created"}</span>
        </div>
        <span className="completed-passengers">{isPoolError ? `${poolMetrics.excessKg || poolMetrics.overweightPassengers.length} kg requires payment` : `Passengers: ${passengerNames}`}</span>
        <div className="completed-actions">
          <button className="completed-undo" type="button" onClick={onUndo}>{isPoolError ? "Review" : "Undo"} <Icon icon={isPoolError ? "arrow_forward" : "undo"} size={22} /></button>
          <button className="selection-close" type="button" aria-label="Bildirimi kapat" onClick={onClear}><Icon icon="close" size={23} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="passenger-selection-bar" role="status" aria-live="polite">
      <div className="selection-left">
        <div className="selection-counter">{String(selectedPassengers.length).padStart(2, "0")}</div>
        <span className="selection-label">Selected</span>
        <div className="selection-chips">
          {selectedPassengers.slice(0, 3).map((passenger) => (
            <span className="selection-chip" key={`${passenger.pnr}-${passenger.name}`}>
              <Avatar type={passenger.avatar} gender={inferPassengerGenderFromName(passenger.name)} state="selected" size="sm" />
              <span>{passenger.name} {passenger.surname.charAt(0) + passenger.surname.slice(1).toLowerCase()}</span>
              <button type="button" aria-label={`${passenger.name} seçimini kaldır`} onClick={() => onRemove(passenger)}><Icon icon="close" size={17} /></button>
            </span>
          ))}
        </div>
      </div>
      <div className="selection-actions">
        <span className="selection-baggage"><Icon icon="luggage" size={18} fill />{poolMetrics.pieces} Bags - {poolMetrics.kilograms} kg</span>
        <button className="selection-button ghost" type="button" onClick={onCreatePool}>Create Pool <Icon icon="add" size={18} /></button>
        <button className="selection-button primary" type="button" onClick={onCheckInAll}>Check-in all</button>
        <button className="selection-close" type="button" aria-label="Seçimi kapat" onClick={onClear}><Icon icon="close" size={23} /></button>
      </div>
    </div>
  );
}

function PassengerCheckInOverlay({
  open,
  selectedPassengers,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedPassengers: Passenger[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [checkedPassengers, setCheckedPassengers] = useState(() => new Set(selectedPassengers.map((passenger) => passenger.pnr)));
  const { isMounted, isVisible } = useAnimatedPresence(open, 220);

  useEffect(() => {
    setCheckedPassengers(new Set(selectedPassengers.map((passenger) => passenger.pnr)));
  }, [selectedPassengers]);

  if (selectedPassengers.length === 0 || !isMounted) return null;

  return (
    <div className="checkin-overlay" data-state={isVisible ? "open" : "closed"} role="dialog" aria-modal="true" aria-labelledby="checkin-title">
      <div className="checkin-overlay-scrim" />
      <aside className="checkin-popup">
        <header className="checkin-popup-header">
          <div>
            <h2 id="checkin-title">Check-in selected passengers</h2>
            <p>Review {selectedPassengers.length} passengers before check-in</p>
          </div>
          <button type="button" aria-label="Popup kapat" onClick={onClose}><Icon icon="close" size={20} /></button>
        </header>
        <div className="checkin-popup-body">
          <div className="checkin-summary">
            <div><Icon icon="group" size={19} /><strong>{selectedPassengers.length}</strong><span>Passengers</span></div>
            <div><Icon icon="gpp_good" size={19} /><strong>{selectedPassengers.length}/{selectedPassengers.length}</strong><span>APIS Ready</span></div>
            <div><Icon icon="luggage" size={19} /><strong>8</strong><span>Total Bags</span></div>
          </div>
          <section className="checkin-selected">
            <h3>Selected Passengers</h3>
            <p>Ready to check-in</p>
            <div className="checkin-passenger-list">
                  {selectedPassengers.slice(0, 4).map((passenger, index) => {
                const checked = checkedPassengers.has(passenger.pnr);
                return (
                <div className={`checkin-passenger-card ${checked ? "active" : ""}`} key={`${passenger.pnr}-${passenger.name}`}>
                  <button
                    className="checkin-card-checkbox"
                    type="button"
                    aria-label={`${passenger.name} seçimini değiştir`}
                    aria-pressed={checked}
                    onClick={() => setCheckedPassengers((current) => {
                      const next = new Set(current);
                      if (next.has(passenger.pnr)) next.delete(passenger.pnr);
                      else next.add(passenger.pnr);
                      return next;
                    })}
                  >
                    <CheckboxMark checked={checked} />
                  </button>
                  <Avatar type={passenger.avatar} gender={inferPassengerGenderFromName(passenger.name)} state={checked ? "selected" : "active"} size="md" />
                  <div>
                    <strong>{passenger.name} {passenger.surname.charAt(0) + passenger.surname.slice(1).toLowerCase()}</strong>
                    <span>{passenger.pnr} - Seat: {passenger.seat} - Baggage: 1pc /{index === 0 ? "18" : index === 1 ? "22" : "12"}kg</span>
                  </div>
                  <em>Ready</em>
                </div>
                );
              })}
            </div>
          </section>
        </div>
        <footer className="checkin-popup-footer">
          <button type="button" className="checkin-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="checkin-confirm" onClick={onConfirm}>Check-in</button>
        </footer>
      </aside>
    </div>
  );
}


type PaymentMethod = "card" | "pos" | "link";
type CardPaymentStep = "default" | "processing" | "completed" | "failed";
type PosPaymentStep = "select" | "processing" | "completed" | "failed";
type LinkPaymentStep = "default" | "waiting" | "creating" | "completed";

function ExcessBaggagePaymentPopup({
  open,
  amount,
  responsible,
  onClose,
  onPaymentComplete,
}: {
  open: boolean;
  amount: string;
  responsible: string;
  onClose: () => void;
  onPaymentComplete: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardStep, setCardStep] = useState<CardPaymentStep>("default");
  const [posStep, setPosStep] = useState<PosPaymentStep>("select");
  const [linkStep, setLinkStep] = useState<LinkPaymentStep>("default");
  const [linkChannel, setLinkChannel] = useState<"email" | "sms">("email");
  const [selectedPos, setSelectedPos] = useState("POS-04");
  const [linkCountdown, setLinkCountdown] = useState(10);
  const { isMounted, isVisible } = useAnimatedPresence(open, 200);

  useEffect(() => {
    if (cardStep !== "processing") return;
    const timeout = window.setTimeout(() => setCardStep("completed"), 900);
    return () => window.clearTimeout(timeout);
  }, [cardStep]);

  useEffect(() => {
    if (posStep !== "processing") return;
    const timeout = window.setTimeout(() => setPosStep("completed"), 1100);
    return () => window.clearTimeout(timeout);
  }, [posStep]);

  useEffect(() => {
    if (linkStep !== "waiting") return;
    setLinkCountdown(10);
    const interval = window.setInterval(() => {
      setLinkCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setLinkStep("creating");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [linkStep]);

  useEffect(() => {
    if (linkStep !== "creating") return;
    const timeout = window.setTimeout(() => setLinkStep("completed"), 1200);
    return () => window.clearTimeout(timeout);
  }, [linkStep]);

  const switchMethod = (nextMethod: PaymentMethod) => {
    setMethod(nextMethod);
    setCardStep("default");
    setPosStep("select");
    setLinkStep("default");
    setLinkCountdown(10);
  };
  const isLinkProgress = method === "link" && linkStep !== "default";
  const isTerminal = (method === "card" && cardStep !== "default") || (method === "pos" && posStep !== "select") || isLinkProgress;

  const renderTabs = () => (
    <div className="payment-method-tabs" role="tablist" aria-label="Payment method">
      <button type="button" className={`payment-method-tab ${method === "card" ? "active" : ""}`} role="tab" aria-selected={method === "card"} onClick={() => switchMethod("card")}>
        <Icon icon="credit_card" size={24} fill />
        <span>Credit Card</span>
      </button>
      <button type="button" className={`payment-method-tab ${method === "pos" ? "active" : ""}`} role="tab" aria-selected={method === "pos"} onClick={() => switchMethod("pos")}>
        <Icon icon="point_of_sale" size={24} fill />
        <span>Physical Pos</span>
      </button>
      <button type="button" className={`payment-method-tab ${method === "link" ? "active" : ""}`} role="tab" aria-selected={method === "link"} onClick={() => switchMethod("link")}>
        <Icon icon="link" size={24} />
        <span>Payment Link</span>
      </button>
    </div>
  );

  const renderDefaultShell = (children: ReactNode) => (
    <>
      <section className="payment-section payment-method-section">
        <div className="payment-section-heading">
          <h3>Payment Method</h3>
          <p>Responsible: {responsible}</p>
        </div>
        {renderTabs()}
      </section>
      <section className="payment-section payment-info-section">{children}</section>
    </>
  );

  const renderCardForm = () => renderDefaultShell(
    <>
      <h3>Payment Informations</h3>
      <TkInput label="Card Holder Name" placeholder="Name Surname" showAsterisk className="payment-tk-input" />
      <div className="payment-field payment-card-field">
        <span>Card Informations<sup>*</sup></span>
        <div className="payment-input-row payment-card-number">
          <TkInput label="" placeholder="1234 1234 1234 1234" icon="credit_card" className="payment-tk-input inline" ariaLabel="Card Informations" />
          <div className="payment-card-brands" aria-hidden="true">
            <span className="payment-card-brand visa">VISA</span>
            <span className="payment-card-brand mastercard"><i /><i /></span>
            <span className="payment-card-brand discover">DISC</span>
          </div>
        </div>
        <div className="payment-card-details">
          <TkInput label="" placeholder="MM/YY" className="payment-tk-input compact" ariaLabel="Expiration date" />
          <TkInput label="" placeholder="CVC" icon="credit_card" iconPosition="right" className="payment-tk-input compact" ariaLabel="CVC" />
        </div>
        <p className="payment-support-text"><Icon icon="info" size={14} fill />This is supporting text</p>
      </div>
      <TkButton label={`Pay ${amount}`} variant="danger" fullWidth className="payment-tk-button" onClick={() => setCardStep("processing")} />
    </>
  );

  const renderPosSelect = () => renderDefaultShell(
    <>
      <h3>Select Terminal</h3>
      <div className="payment-pos-list">
        {[
          { id: "POS-04", status: "Online", note: "Enter card detailts on the counter", online: true },
          { id: "POS-08", status: "Online", note: "Send a secure via SMS or E-mail", online: true },
          { id: "POS-12", status: "Offline", note: "Charge on a counter card terminal", online: false },
        ].map((terminal) => (
          <button
            key={terminal.id}
            type="button"
            className={`payment-pos-card ${selectedPos === terminal.id ? "selected" : ""} ${terminal.online ? "" : "disabled"}`}
            onClick={() => terminal.online && setSelectedPos(terminal.id)}
            disabled={!terminal.online}
          >
            <Icon icon="point_of_sale" size={24} fill />
            <span><strong>{terminal.id}</strong><small>{terminal.status}</small><em>{terminal.note}</em></span>
            <i />
          </button>
        ))}
      </div>
      <TkButton label={`Pay ${amount}`} variant="danger" fullWidth className="payment-tk-button" onClick={() => setPosStep("processing")} />
    </>
  );

  const renderLinkDefault = () => renderDefaultShell(
    <>
      <h3>Send Via</h3>
      <div className="payment-channel-grid">
        <button type="button" className={`payment-channel-card ${linkChannel === "email" ? "selected" : ""}`} onClick={() => setLinkChannel("email")}>
          <Icon icon="mail" size={20} fill />
          <span>E-mail</span>
          <TkCheckboxMark checked={linkChannel === "email"} label="E-mail" />
        </button>
        <button type="button" className={`payment-channel-card ${linkChannel === "sms" ? "selected" : ""}`} onClick={() => setLinkChannel("sms")}>
          <Icon icon="sms" size={20} fill />
          <span>SMS</span>
          <TkCheckboxMark checked={linkChannel === "sms"} label="SMS" />
        </button>
      </div>
      <TkInput
        label={linkChannel === "email" ? "e-mail adress" : "Phone Number"}
        value={linkChannel === "email" ? "furkanayin@gmail.com" : "+90 555 123 45 67"}
        readonly
        showAsterisk
        className="payment-tk-input"
      />
      <TkButton label="Send Link" variant="danger" fullWidth className="payment-tk-button" onClick={() => setLinkStep("waiting")} />
    </>
  );

  const renderProcessing = (subtitle: string) => (
    <div className="payment-state-panel compact">
      <TkSpinner label="Processing" />
      <h3>Processing...</h3>
      <p>{subtitle}</p>
      <small>Do not close this window while processing</small>
    </div>
  );

  const renderFailed = (methodLabel: string, onBack: () => void) => (
    <div className="payment-result-panel">
      <span className="payment-result-icon failed"><Icon icon="close" size={42} fill /></span>
      <h3>Payment Failed</h3>
      <p>Failed to charge excess baggage fee.</p>
      <strong>{amount}</strong>
      <small>{methodLabel}</small>
      <div className="payment-result-actions">
        <TkButton label="Back" variant="neutral" type="outlined" icon="arrow_back" className="payment-tk-button secondary" onClick={onBack} />
        <TkButton label="Done" variant="danger" className="payment-tk-button" onClick={onClose} />
      </div>
    </div>
  );

  const renderCompleted = (methodLabel: string, wide = false) => (
    <div className={`payment-result-panel ${wide ? "wide" : ""}`}>
      {wide && <PaymentProgress current="completed" countdown={0} />}
      <span className="payment-result-icon success"><Icon icon="check_circle" size={42} fill /></span>
      <h3>Payment Completed</h3>
      <p>Excess baggage fee charged.</p>
      <strong>{amount}</strong>
      <small>{methodLabel}</small>
      <div className="payment-emd-row"><Icon icon="receipt_long" size={24} fill /><span>EMD No</span><b>EBT823192423</b></div>
      <div className="payment-result-actions">
        <TkButton label="Print Reciept" variant="neutral" type="outlined" icon="print" iconPosition="right" className="payment-tk-button secondary" />
        <TkButton label="Done" variant="danger" className="payment-tk-button" onClick={onPaymentComplete} />
      </div>
    </div>
  );

  const renderLinkProgress = () => {
    if (linkStep === "waiting") {
      return (
        <div className="payment-link-flow">
          <PaymentProgress current="waiting" countdown={linkCountdown} />
          <div className="payment-link-message">
            <h3>{String(linkCountdown).padStart(2, "0")}</h3>
            <p>Waiting for passenger payment confirmation.</p>
            <button type="button" className="payment-text-button" onClick={() => { setLinkCountdown(10); setLinkStep("waiting"); }}>Send Payment Link Again</button>
          </div>
          <PaymentStatusTable status="waiting" amount={amount} />
        </div>
      );
    }
    if (linkStep === "creating") {
      return (
        <div className="payment-link-flow">
          <PaymentProgress current="creating" countdown={0} />
          <div className="payment-state-panel">
            <TkSpinner label="Processing" />
            <h3>Payment Completed</h3>
            <p>Payment received. EMD is being created.</p>
          </div>
          <PaymentStatusTable status="creating" amount={amount} />
        </div>
      );
    }
    return renderCompleted("E-mail/SMS", true);
  };

  let body: ReactNode;
  if (method === "card") {
    if (cardStep === "processing") body = renderProcessing("Authorising Card...");
    else if (cardStep === "completed") body = renderCompleted("Credit/Debit Card");
    else if (cardStep === "failed") body = renderFailed("Credit/Debit Card", () => setCardStep("default"));
    else body = renderCardForm();
  } else if (method === "pos") {
    if (posStep === "processing") body = renderProcessing(`Waiting for ${selectedPos} to response...`);
    else if (posStep === "completed") body = renderCompleted("Physical Pos");
    else if (posStep === "failed") body = renderFailed("Physical Pos", () => setPosStep("select"));
    else body = renderPosSelect();
  } else if (linkStep === "default") {
    body = renderLinkDefault();
  } else {
    body = renderLinkProgress();
  }

  if (!isMounted) return null;

  return (
    <div className="payment-overlay" data-state={isVisible ? "open" : "closed"} role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div className="payment-overlay-scrim" onClick={onClose} />
      <section className={`payment-popup ${isLinkProgress ? "wide" : ""} ${isTerminal ? "terminal" : ""}`}>
        <header className="payment-popup-header">
          {isLinkProgress && (
            <button type="button" className="payment-back-button" aria-label="Geri" onClick={() => setLinkStep("default")}>
              <Icon icon="arrow_back" size={20} />
            </button>
          )}
          <div><h2 id="payment-title">Excess Baggage Payment</h2></div>
          <button type="button" aria-label="Odeme popup kapat" onClick={onClose}><Icon icon="close" size={20} /></button>
        </header>
        <div className="payment-popup-body">{body}</div>
      </section>
    </div>
  );
}

function PaymentProgress({ current, countdown }: { current: "waiting" | "creating" | "completed"; countdown: number }) {
  const steps = [
    { key: "sent", title: "E-mail Gönderildi", detail: "Ödeme Bekleniyor" },
    { key: "waiting", title: "Ödeme Durumu", detail: current === "waiting" ? `${countdown} sn` : "Ödeme Alındı" },
    { key: "creating", title: "EMD", detail: current === "completed" ? "Emd Oluşturuldu" : "Emd Oluşturuluyor" },
    { key: "completed", title: "EMD", detail: "Emd Oluşturuldu" },
  ];
  const activeIndex = current === "waiting" ? 1 : current === "creating" ? 2 : 3;
  return (
    <div className="payment-progress" aria-label="Payment link progress">
      {steps.map((step, index) => (
        <div className={`payment-progress-step ${index < activeIndex ? "done" : ""} ${index === activeIndex ? "active" : ""}`} key={step.key}>
          <span>{index < activeIndex ? <Icon icon="check" size={14} fill /> : null}</span>
          <strong>{step.title}</strong>
          <small>{step.detail}</small>
        </div>
      ))}
    </div>
  );
}

function PaymentStatusTable({ status, amount }: { status: "waiting" | "creating"; amount: string }) {
  return (
    <section className="payment-status-box">
      <h3>Ödeme Durumu</h3>
      <div className="payment-status-table">
        <span>Payment Method</span><b>E-mail/SMS</b>
        <span>Amount</span><b>{amount}</b>
        <span>Passenger</span><b>Zeynep Demir</b>
        <span>Status</span><em className={status === "waiting" ? "waiting" : "success"}>{status === "waiting" ? "Ödeme Bekliyor" : "Ödeme Alındı"}</em>
      </div>
    </section>
  );
}


function CreatePoolOverlay({
  open,
  selectedPassengers,
  onClose,
  onSuccess,
}: {
  open: boolean;
  selectedPassengers: Passenger[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [headPassengerPnr, setHeadPassengerPnr] = useState(selectedPassengers[0]?.pnr ?? "");
  const [step, setStep] = useState<"Head of Pool" | "Creating Pool" | "Overweight" | "Paid" | "Processing Pool">("Head of Pool");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [bagCount, setBagCount] = useState(() => getPoolMetrics(selectedPassengers).pieces);
  const { isMounted, isVisible } = useAnimatedPresence(open, 220);
  const poolMetrics = getPoolMetrics(selectedPassengers);
  const chargeMetrics = getPoolChargeMetrics(selectedPassengers, bagCount, paymentCompleted);
  const headPassenger = selectedPassengers.find((passenger) => passenger.pnr === headPassengerPnr) ?? selectedPassengers[0];
  const poolReference = headPassenger ? `${headPassenger.surname.toUpperCase()} - ${headPassenger.name.toUpperCase()} - ${headPassenger.group}` : "SURNAME - NAME - 000";

  useEffect(() => {
    if (headPassengerPnr && selectedPassengers.some((passenger) => passenger.pnr === headPassengerPnr)) return;
    setHeadPassengerPnr(selectedPassengers[0]?.pnr ?? "");
  }, [headPassengerPnr, selectedPassengers]);

  useEffect(() => {
    setPaymentCompleted(false);
    setPaymentPopupOpen(false);
    setBagCount(getPoolMetrics(selectedPassengers).pieces);
  }, [selectedPassengers]);

  useEffect(() => {
    if (step === "Head of Pool" || step === "Processing Pool") return;
    if (paymentCompleted && chargeMetrics.isOverweight) {
      setStep("Paid");
      return;
    }
    if (chargeMetrics.isOverweight) {
      setStep("Overweight");
      return;
    }
    setStep("Creating Pool");
  }, [chargeMetrics.isOverweight, paymentCompleted, step]);

  useEffect(() => {
    if (step !== "Processing Pool") return;
    const timeout = window.setTimeout(onSuccess, 850);
    return () => window.clearTimeout(timeout);
  }, [onSuccess, step]);

  if (selectedPassengers.length === 0 || !isMounted) return null;

  const goNext = () => {
    if (step === "Head of Pool") {
      if (chargeMetrics.isOverweight && !paymentCompleted) setStep("Overweight");
      else if (chargeMetrics.isOverweight && paymentCompleted) setStep("Paid");
      else setStep("Creating Pool");
      return;
    }
    setStep("Processing Pool");
  };
  const isSecondStep = step !== "Head of Pool";
  const isOverweight = step === "Overweight";
  const isPaid = step === "Paid";
  const stepSubtitle = step === "Head of Pool" ? "Select Head of Pool Passenger" : "Select Responsible Passenger";
  const displayReference = step === "Head of Pool" ? "SURNAME - NAME - 000" : poolReference;
  const showWeightCard = isSecondStep && step !== "Processing Pool";
  const combinedBreakdown = selectedPassengers.flatMap((passenger) => {
    const weights = [String(passenger.baggageInfo.kg)];
    if (passenger.baggageInfo.pieces > 1) {
      for (let piece = 1; piece < passenger.baggageInfo.pieces; piece += 1) weights.push("9");
    }
    return weights;
  }).join("+");

  return (
    <>
    <div className="pool-overlay" data-state={isVisible ? "open" : "closed"} role="dialog" aria-modal="true" aria-labelledby="pool-title">
      <div className="pool-overlay-scrim" />
      <aside className={`pool-popup step-${step.toLowerCase().replaceAll(" ", "-")}`}>
        <header className="pool-popup-header">
          <div>
            <h2 id="pool-title">Create Pool Baggage</h2>
            <p>{selectedPassengers.length} PASSENGERS - POOLED ALLOWANCE</p>
          </div>
          <button type="button" aria-label="Pool popup kapat" onClick={onClose}><Icon icon="close" size={20} /></button>
        </header>

        <div className="pool-popup-body">
          <div className="pool-stepper" aria-label="Pool adımları">
            <span className={step === "Head of Pool" ? "active" : "complete"}><i />Members & Allowence</span>
            <span className={isSecondStep ? "active" : ""}><i />Accept & Baggage Tag</span>
          </div>

          {step === "Processing Pool" ? (
            <section className="pool-processing">
              <span className="pool-processing-icon"><Icon icon="refresh" size={30} fill /></span>
              <h3>Creating Pool</h3>
              <p>Pool reference and shared baggage tag group are being generated.</p>
            </section>
          ) : (
            <>
              <section className="pool-section">
                <h3>Pool Members</h3>
                <p>{stepSubtitle}</p>

                <div className="pool-passenger-list">
                  {selectedPassengers.map((passenger) => {
                    const isHead = passenger.pnr === headPassengerPnr;
                    const passengerOverweight = passenger.baggageInfo.kg > passenger.baggageInfo.allowanceKg;
                    const checked = isHead;
                    return (
                      <div
                        className={`pool-passenger-card ${checked ? "selected" : ""} ${isHead ? "head" : ""} ${passengerOverweight ? "overweight" : ""} ${isSecondStep ? "review" : ""} ${step === "Head of Pool" ? "selectable" : ""}`}
                        key={`${passenger.pnr}-${passenger.name}`}
                        role={step === "Head of Pool" ? "button" : undefined}
                        tabIndex={step === "Head of Pool" ? 0 : -1}
                        aria-pressed={checked}
                        onClick={step === "Head of Pool" ? () => setHeadPassengerPnr(passenger.pnr) : undefined}
                        onKeyDown={step === "Head of Pool" ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setHeadPassengerPnr(passenger.pnr);
                          }
                        } : undefined}
                      >
                        {step === "Head of Pool" && (
                          <button
                            className="pool-card-checkbox"
                            type="button"
                            aria-label={`${passenger.name} head of pool seç`}
                            aria-pressed={checked}
                            onClick={() => setHeadPassengerPnr(passenger.pnr)}
                          >
                            <CheckboxMark checked={checked} />
                          </button>
                        )}
                        <button
                          className="pool-avatar-button"
                          type="button"
                          onClick={step === "Head of Pool" ? () => setHeadPassengerPnr(passenger.pnr) : undefined}
                          aria-label={step === "Head of Pool" ? `${passenger.name} head of pool yap` : undefined}
                          tabIndex={step === "Head of Pool" ? 0 : -1}
                          disabled={step !== "Head of Pool"}
                        >
                          <Avatar type={passenger.avatar} gender={inferPassengerGenderFromName(passenger.name)} state={isHead ? "head" : checked ? "selected" : "active"} size="md" />
                        </button>
                        <div>
                          <strong>{passengerFullName(passenger)}</strong>
                          <span>{passenger.pnr} - Seat: {passenger.seat} - Baggage: {passenger.baggageInfo.pieces}pc /{passenger.baggageInfo.kg}kg</span>
                        </div>
                        <div className="pool-card-badges">
                          {isHead && <em className="pool-badge head">Head of Pool</em>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {!showWeightCard ? (
                <section className="pool-section pool-allowance">
                  <h3>Total Allowance</h3>
                  <div className="pool-weight-info" aria-label="Baggage weight information">
                    <div className="pool-weight-item">
                      <strong>Piece</strong>
                      <span>{poolMetrics.pieces}pc</span>
                    </div>
                    <div className="pool-weight-item">
                      <strong>Kilograms</strong>
                      <span>{poolMetrics.kilograms}kg</span>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="pool-section pool-baggage-weight">
                  <h3>Baggage Weight Information</h3>
                  <div className={`pool-combined-card ${chargeMetrics.progressTone}`}>
                    <div className="pool-combined-header">
                      <strong>Combined Allowance</strong>
                    </div>
                    <div className="pool-combined-stats">
                      <div className="pool-combined-total">
                        <span>{chargeMetrics.kilograms}</span>
                        <small>/{chargeMetrics.displayAllowanceKg}kg</small>
                      </div>
                      <div className={`pool-combined-note ${chargeMetrics.progressTone}`}>
                        <Icon icon={isPaid ? "check_circle" : isOverweight ? "error" : "info"} size={14} fill />
                        <span>
                          {isPaid
                            ? "Baggage allowance limit reached."
                            : isOverweight
                              ? chargeMetrics.extraWeightKg > 0
                                ? `Baggage limit exceeded by ${chargeMetrics.overweightKg} kg.`
                                : "Additional baggage payment required."
                              : `${Math.max(chargeMetrics.baggageLimitKg - chargeMetrics.kilograms, 0)}kg free`}
                        </span>
                      </div>
                    </div>
                    <div className={`pool-progress-track ${chargeMetrics.progressTone}`}>
                      <span
                        className={`pool-progress-fill ${chargeMetrics.progressTone}`}
                        style={{ width: `${Math.min(100, (chargeMetrics.kilograms / Math.max(chargeMetrics.displayAllowanceKg, 1)) * 100)}%` }}
                      />
                    </div>
                    <p className="pool-combined-breakdown">
                      Pooled from {selectedPassengers.length} passengers ({combinedBreakdown})
                    </p>
                    <div className="pool-total-bags">
                      <div className="pool-total-bags-head">
                        <strong>Total Bags</strong>
                        <sup>*</sup>
                      </div>
                      <div className="pool-bag-stepper" aria-label="Toplam bagaj">
                        <button type="button" aria-label="Bag azalt" onClick={() => {
                          setPaymentCompleted(false);
                          setBagCount((current) => Math.max(0, current - 1));
                        }}><Icon icon="remove" size={18} /></button>
                        <span>{chargeMetrics.pieces}/{chargeMetrics.includedBags}</span>
                        <button type="button" aria-label="Bag artır" onClick={() => {
                          setPaymentCompleted(false);
                          setBagCount((current) => current + 1);
                        }}><Icon icon="add" size={18} /></button>
                      </div>
                    </div>
                    <div className="pool-bag-helper">
                      <button type="button" className="pool-bag-helper-icon" aria-label="Allowance details">
                        <Icon icon="info" size={14} fill />
                      </button>
                      <span>{chargeMetrics.helperText}</span>
                      <div className="pool-bag-tooltip" role="tooltip" aria-hidden="true">
                        <span className="pool-bag-tooltip-icon"><Icon icon="info" size={11} /></span>
                        <div>
                          <strong>{chargeMetrics.includedBags} Bags Allowance Included</strong>
                          <span>You can add more if needed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {isOverweight && (
                <section className="pool-payment-card">
                  {chargeMetrics.extraPieceCount > 0 && (
                    <div className="pool-payment-row">
                      <div className="pool-payment-copy">
                        <Icon className="pool-payment-sign" icon="luggage" size="base" sign variant="danger" fill />
                        <div>
                          <strong>Extra Piece</strong>
                          <span>{chargeMetrics.extraPieceCount} Extra Piece - {formatEuro(chargeMetrics.extraPiecePrice)} - Billed to {passengerFullName(headPassenger)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {chargeMetrics.extraWeightKg > 0 && (
                    <div className="pool-payment-row">
                      <div className="pool-payment-copy">
                        <Icon className="pool-payment-sign" icon="scale" size="base" sign variant="danger" fill />
                        <div>
                          <strong>Extra Weight</strong>
                          <span>{chargeMetrics.extraWeightKg}kg Extra Weight - {formatEuro(chargeMetrics.extraWeightPrice)} - Billed to {passengerFullName(headPassenger)}</span>
                        </div>
                      </div>
                      <button type="button" className="pool-pay-button" onClick={() => setPaymentPopupOpen(true)}>Pay Now</button>
                    </div>
                  )}
                </section>
              )}

              {isPaid && (
                <section className="pool-payment-success">
                  <div className="pool-payment-copy">
                    <Icon className="pool-payment-sign" icon="check_circle" size="base" sign variant="success" fill />
                    <div>
                      <strong>Payment completed successfully.</strong>
                      <span>Paid in Total: {formatEuro(chargeMetrics.totalPaid)}&nbsp;&nbsp; Receipt no: EBT838895</span>
                    </div>
                  </div>
                  <button type="button" className="pool-payment-undo" onClick={() => {
                    setPaymentCompleted(false);
                    setStep("Overweight");
                  }}>Undo <Icon icon="undo" size={16} /></button>
                </section>
              )}

              <section className="pool-section pool-reference">
                <h3>Pool Reference</h3>
                <div><Icon icon="qr_code_2" size={20} fill /><span>{displayReference}</span><em>auto-generated</em></div>
                <p>All bags in this pool share one tracking group and are tagged together at the belt.</p>
              </section>
            </>
          )}
        </div>

        {step !== "Processing Pool" && (
          <footer className="pool-popup-footer">
            <button type="button" className="pool-cancel" onClick={onClose}>Cancel</button>
            <button type="button" className={`pool-confirm ${isOverweight ? "disabled" : ""}`} onClick={goNext} disabled={isOverweight}>
              {isSecondStep ? "Create Pool" : "Next"} <Icon icon="arrow_right_alt" size={19} fill />
            </button>
          </footer>
        )}
      </aside>
    </div>
    <ExcessBaggagePaymentPopup
      open={paymentPopupOpen}
      amount={formatEuro(chargeMetrics.extraPiecePrice + chargeMetrics.extraWeightPrice)}
      responsible={passengerFullName(headPassenger)}
      onClose={() => setPaymentPopupOpen(false)}
      onPaymentComplete={() => {
        setPaymentPopupOpen(false);
        setPaymentCompleted(true);
        setStep("Paid");
      }}
    />
    </>
  );
}

function PassengerTable({ passengers }: { passengers: Passenger[] }) {
  const [selectedRowsState, setSelectedRowsState] = useState<boolean[]>(passengers.map(() => false));
  const [checkInOverlayOpen, setCheckInOverlayOpen] = useState(false);
  const [poolOverlayOpen, setPoolOverlayOpen] = useState(false);
  const [floatingBarMode, setFloatingBarMode] = useState<"selection" | "checkin-completed" | "pool-success" | "pool-error">("selection");
  const [query, setQuery] = useState("");
  useEffect(() => {
    setSelectedRowsState(passengers.map(() => false));
    setCheckInOverlayOpen(false);
    setPoolOverlayOpen(false);
    setFloatingBarMode("selection");
    setQuery("");
  }, [passengers]);
  const visible = useMemo(() => passengers.filter((p) => `${p.name} ${p.surname} ${p.pnr}`.toLowerCase().includes(query.toLowerCase())), [passengers, query]);
  const selectedPassengers = useMemo(() => passengers.filter((_, index) => selectedRowsState[index]), [passengers, selectedRowsState]);
  const allSelected = selectedRowsState.length > 0 && selectedRowsState.every(Boolean);
  const someSelected = selectedRowsState.some(Boolean) && !allSelected;
  const toggle = (index: number) => {
    setFloatingBarMode("selection");
    setSelectedRowsState((rows) => rows.map((item, row) => row === index ? !item : item));
  };
  const toggleAll = () => {
    const nextState = !allSelected;
    setFloatingBarMode("selection");
    setSelectedRowsState(passengers.map(() => nextState));
  };
  const removePassenger = (passenger: Passenger) => {
    const index = passengers.indexOf(passenger);
    setFloatingBarMode("selection");
    if (index >= 0) setSelectedRowsState((rows) => rows.map((item, row) => row === index ? false : item));
  };
  const clearSelection = () => {
    setSelectedRowsState((rows) => rows.map(() => false));
    setCheckInOverlayOpen(false);
    setPoolOverlayOpen(false);
    setFloatingBarMode("selection");
  };
  const openCheckInOverlay = () => {
    if (selectedPassengers.length > 0) setCheckInOverlayOpen(true);
  };
  const openPoolOverlay = () => {
    if (selectedPassengers.length > 0) setPoolOverlayOpen(true);
  };
  const completeCheckIn = () => {
    setCheckInOverlayOpen(false);
    setFloatingBarMode("checkin-completed");
  };
  const completePool = () => {
    setPoolOverlayOpen(false);
    setFloatingBarMode("pool-success");
  };
  return (
    <>
      <section className="passenger-panel">
        <header className="passenger-toolbar">
          <h2><Icon icon="groups" size={23} fill />Yolcu Listesi</h2>
          <div className="table-tools">
            <label className="passenger-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Yolcu ara" /><Icon icon="search" size={19} /></label>
            <button><Icon icon="filter_list" size={19} /><span>Filter</span><Icon icon="keyboard_arrow_down" size={17} /></button>
            <button><Icon icon="filter_list" size={19} /><span>Filter</span><Icon icon="keyboard_arrow_down" size={17} /></button>
            <button aria-label="Yenile"><Icon icon="refresh" size={22} /></button>
            <button aria-label="Tam ekran"><Icon icon="open_in_full" size={21} /></button>
            <button aria-label="Ayarlar"><Icon icon="settings" size={22} /></button>
          </div>
        </header>
        <div className="table-shell">
          <div className="table-row table-head">
            <span>
              <button type="button" className="check-button header-check" aria-label="Tüm yolcuları seç" aria-pressed={allSelected} onClick={toggleAll}>
                <CheckboxMark checked={allSelected} mixed={someSelected} />
              </button>
            </span>
            <span>CI</span><span>PNR</span><span>Ad</span><span>Soyad</span><span>Grup</span><span>Koltuk</span><span>Bagaj</span><span>Apis</span><span>Tier</span><span>Class</span><span>Com...</span><span>Quick Acts</span><span />
          </div>
          {visible.map((person) => {
            const index = passengers.indexOf(person);
            return (
              <div className="table-row passenger-row" key={person.pnr + person.name}>
                <button className="check-button" aria-label={`${person.name} seç`} onClick={() => toggle(index)}><CheckboxMark checked={selectedRowsState[index]} /></button>
                <span className={`ci-state ${person.ci}`}><Icon icon={person.ci === "checked" ? "touch_app" : "refresh"} size={25} /></span>
                <span>{person.pnr}</span>
                <span className="passenger-name">
                  <Avatar
                    type={person.avatar}
                    gender={inferPassengerGenderFromName(person.name)}
                    state={selectedRowsState[index] ? "selected" : person.baggage === "alert" ? "danger" : person.ci === "checked" ? "active" : "muted"}
                    size="sm"
                  />
                  {person.name}
                </span>
                <span>{person.surname}</span><span>{person.group}</span><span>{person.seat}</span>
                <span className={`bag ${person.baggage} baggage-cell`}><BaggageNotificationIcon tone={person.baggage} /></span>
                <span className={`apis ${person.apis}`}><b>A</b></span>
                <span><em className={`tier ${person.tier.toLowerCase()}`}>{person.tier}</em></span><span>Y/ EC</span>
                <span className={`message ${person.message ? "active" : ""}`}><CommentNotificationIcon count={person.message} /></span>
                <span className="quick-actions"><button>Check-in</button><Icon icon="more_vert" size={21} /></span>
                <button className="row-expand" aria-label="Satırı genişlet"><Icon icon="keyboard_arrow_down" size={18} /></button>
              </div>
            );
          })}
        </div>
      </section>
      <PassengerSelectionBar selectedPassengers={selectedPassengers} onRemove={removePassenger} onClear={clearSelection} onCheckInAll={openCheckInOverlay} onCreatePool={openPoolOverlay} mode={floatingBarMode} onUndo={() => {
        setFloatingBarMode("selection");
        if (floatingBarMode === "pool-error") setPoolOverlayOpen(true);
      }} />
      <PassengerCheckInOverlay open={checkInOverlayOpen} selectedPassengers={selectedPassengers} onClose={() => setCheckInOverlayOpen(false)} onConfirm={completeCheckIn} />
      <CreatePoolOverlay open={poolOverlayOpen} selectedPassengers={selectedPassengers} onClose={() => setPoolOverlayOpen(false)} onSuccess={completePool} />
    </>
  );
}

const seatLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
const type2RowSpecialBlocks: Record<number, { left?: "Spacer" | "Exit" | "Wing" | "Engine"; right?: "Spacer" | "Engine" }> = {
  1: { left: "Spacer", right: "Spacer" },
  2: { left: "Spacer", right: "Spacer" },
  3: { left: "Spacer", right: "Spacer" },
  4: { left: "Exit", right: "Engine" },
  5: { left: "Spacer", right: "Spacer" },
  6: { left: "Spacer", right: "Spacer" },
  7: { left: "Spacer", right: "Spacer" },
  8: { left: "Wing", right: "Engine" },
  9: { left: "Wing", right: "Engine" },
  10: { left: "Spacer", right: "Spacer" },
  11: { left: "Engine", right: "Engine" },
  12: { left: "Engine", right: "Engine" },
  13: { left: "Spacer", right: "Spacer" },
  14: { left: "Spacer", right: "Spacer" },
  15: { left: "Spacer", right: "Spacer" },
  16: { left: "Spacer", right: "Spacer" },
  17: { left: "Spacer", right: "Spacer" },
  18: { left: "Spacer", right: "Spacer" },
  19: { left: "Exit", right: "Engine" },
  20: { left: "Spacer", right: "Spacer" },
  21: { left: "Spacer", right: "Spacer" },
  22: { left: "Spacer", right: "Spacer" },
  23: { left: "Spacer", right: "Spacer" },
  24: { left: "Spacer", right: "Spacer" },
  25: { left: "Spacer", right: "Spacer" },
  26: { left: "Spacer", right: "Spacer" },
  27: { left: "Spacer", right: "Spacer" },
  28: { left: "Spacer", right: "Spacer" },
};
const type2SeatIcons: Record<number, Record<number, string>> = {
  1: { 6: "Insturments" },
  2: { 2: "UM" },
  3: { 3: "Insturments" },
  4: { 4: "Wheelchair" },
  6: { 2: "Baby" },
  7: { 6: "Pet" },
  9: { 1: "Pet", 3: "UM" },
  12: { 1: "Wheelchair", 3: "Baby" },
  15: { 3: "Holidays" },
  19: { 3: "UM" },
  22: { 3: "Wheelchair", 6: "Pet" },
  26: { 1: "Insturments", 4: "Funeral" },
  28: { 7: "Baby" },
};
const type2IconLabels: Record<string, string> = {
  Insturments: "IN",
  UM: "UM",
  Wheelchair: "WC",
  Baby: "BB",
  Pet: "PT",
  Holidays: "HD",
  Funeral: "FN",
};

function Seat({ id, selected, onToggle }: { id: string; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <button
      className={`seat ${selected ? "selected" : ""}`}
      type="button"
      aria-label={`${id} koltuğu`}
      aria-pressed={selected}
      data-seat-id={id}
      onClick={() => onToggle(id)}
    >
      4B
    </button>
  );
}

function Type1Block({ active, side }: { active: boolean; side: "left" | "right" }) {
  return <span className={`type1-block ${active ? "feature" : "spacer"} ${side}`} aria-hidden="true" />;
}

function SeatRows({ rows, startRow, markers = [], selectedSeats, onToggle }: { rows: number; startRow: number; markers?: number[]; selectedSeats: Set<string>; onToggle: (id: string) => void }) {
  if (markers.length > 0) {
    return (
      <div className="seat-rows type1-rows">
        {Array.from({ length: rows }, (_, row) => {
          const rowNumber = startRow + row;
          const markerActive = markers.includes(row);
          const seat = (letterIndex: number) => {
            const id = `${rowNumber}${seatLetters[letterIndex]}`;
            return <Seat key={id} id={id} selected={selectedSeats.has(id)} onToggle={onToggle} />;
          };
          return (
            <div className="seat-row-type1" key={rowNumber}>
              <div className="seat-type1-group left">
                <Type1Block active={markerActive} side="left" />
                {seat(0)}
                {seat(1)}
              </div>
              <div className="seat-type1-group center">
                {seat(2)}
                {seat(3)}
                {seat(4)}
                {seat(5)}
              </div>
              <div className="seat-type1-group right">
                {seat(6)}
                {seat(7)}
                <Type1Block active={markerActive} side="right" />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="seat-rows">
      {Array.from({ length: rows }, (_, row) => {
        const rowNumber = startRow + row;
        const seat = (letterIndex: number) => {
          const id = `${rowNumber}${seatLetters[letterIndex]}`;
          return <Seat key={id} id={id} selected={selectedSeats.has(id)} onToggle={onToggle} />;
        };
        return (
          <div className="seat-row" key={rowNumber}>
            {markers.includes(row) && <i className="exit left" />}
            {seat(0)}{seat(1)}<span className="seat-aisle" aria-hidden="true" />
            {seat(2)}{seat(3)}{seat(4)}{seat(5)}<span className="seat-aisle" aria-hidden="true" />
            {seat(6)}{seat(7)}
            {markers.includes(row) && <i className="exit right" />}
          </div>
        );
      })}
    </div>
  );
}

function Type2Block({ kind, label }: { kind: "Spacer" | "Aisle" | "Exit" | "Wing" | "Engine"; label?: string }) {
  if (kind === "Spacer") return <span className="type2-block spacer" aria-hidden="true" />;
  if (kind === "Aisle") return <span className="type2-block aisle" aria-hidden="true">{label}</span>;
  return <span className={`type2-block feature ${kind.toLowerCase()}`} aria-hidden="true" />;
}

function Type2Seat({
  id,
  selected,
  onToggle,
  icon,
}: { id: string; selected: boolean; onToggle: (id: string) => void; icon?: string }) {
  return (
    <button
      className={`seat seat-type2 ${selected ? "selected" : ""}`}
      type="button"
      aria-label={`${id} koltuğu`}
      aria-pressed={selected}
      data-seat-id={id}
      onClick={() => onToggle(id)}
    >
      {icon && <span className="seat-type2-icon">{type2IconLabels[icon] ?? icon.slice(0, 2).toUpperCase()}</span>}
    </button>
  );
}

function Type2SeatRows({ rows, startRow, selectedSeats, onToggle }: { rows: number; startRow: number; selectedSeats: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="seat-rows type2-rows">
      {Array.from({ length: rows }, (_, row) => {
        const rowNumber = startRow + row;
        const rowBlocks = type2RowSpecialBlocks[rowNumber] ?? { left: "Spacer", right: "Spacer" };
        const rowIcons = type2SeatIcons[rowNumber] ?? {};
        const seat = (seatIndex: number) => {
          const id = `${rowNumber}${seatLetters[seatIndex]}`;
          return <Type2Seat key={id} id={id} selected={selectedSeats.has(id)} onToggle={onToggle} icon={rowIcons[seatIndex]} />;
        };
        return (
          <div className="seat-row seat-row-type2" key={rowNumber}>
            <div className="seat-type2-group left">
              <Type2Block kind={rowBlocks.left ?? "Spacer"} />
              {seat(0)}
              {seat(1)}
              <Type2Block kind="Aisle" label={String(rowNumber)} />
            </div>
            <div className="seat-type2-group center">
              {seat(2)}
              {seat(3)}
              {seat(4)}
              {seat(5)}
            </div>
            <div className="seat-type2-group right">
              <Type2Block kind="Aisle" label={String(rowNumber)} />
              {seat(6)}
              {seat(7)}
              <Type2Block kind={rowBlocks.right ?? "Spacer"} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeatMap({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange: (collapsed: boolean) => void }) {
  const [cm, setCm] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(() => new Set());
  const toggleSeat = (id: string) => setSelectedSeats((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  return (
    <aside className={`seat-map ${collapsed ? "collapsed" : ""}`} aria-label="Koltuk haritası" aria-expanded={!collapsed}>
      <div className="seat-title">
        <button
          type="button"
          className="seat-collapse-button"
          aria-label={collapsed ? "Koltuk haritasını aç" : "Koltuk haritasını kapat"}
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <Icon icon={collapsed ? "chevron_left" : "chevron_right"} size={22} />
        </button>
        {!collapsed && (
          <>
            <h2>Seat Map <Icon icon="info" size={18} /></h2>
            <label className="toggle"><input type="checkbox" checked={cm} onChange={(e) => setCm(e.target.checked)} /><i /></label><span>CM</span>
          </>
        )}
      </div>
      {collapsed ? (
        <div className="seat-map-collapsed-shell" aria-hidden="true">
          <div className="mini-title">Seatmap</div>
          <button className="mini-action offload" tabIndex={-1} aria-hidden="true"><Icon icon="south_west" size={22} /></button>
          <button className="mini-action add" tabIndex={-1} aria-hidden="true"><Icon icon="add" size={24} /></button>
          <button className="mini-action info" tabIndex={-1} aria-hidden="true"><Icon icon="info" size={24} /></button>
        </div>
      ) : (
        <div className={`seat-map-content ${cm ? "type2" : "type1"}`}>
          <div className="seat-tools">
            <button aria-label="Filter">
              <Icon icon="filter_list" size={16} />
              <span>Filter</span>
              <Icon icon="keyboard_arrow_down" size={16} />
            </button>
            <button aria-label="No Rec">
              <Icon icon="add" size={18} />
              <span>No Rec</span>
            </button>
            <button className="offload" aria-label="Offload">
              <Icon icon="south_west" size={18} />
              <span>Offload</span>
            </button>
          </div>
          <div className="cabin-label"><span />BUSINESS<span /></div>
          {cm ? <Type2SeatRows rows={3} startRow={1} selectedSeats={selectedSeats} onToggle={toggleSeat} /> : <SeatRows rows={3} startRow={1} selectedSeats={selectedSeats} onToggle={toggleSeat} />}
          <div className="cabin-label"><span />ECONOMY<span /></div>
          {cm ? <Type2SeatRows rows={16} startRow={4} selectedSeats={selectedSeats} onToggle={toggleSeat} /> : <SeatRows rows={16} startRow={4} markers={[0, 5, 6, 9]} selectedSeats={selectedSeats} onToggle={toggleSeat} />}
          <div className="cabin-label"><span />ECONOMY<span /></div>
          {cm ? <Type2SeatRows rows={10} startRow={20} selectedSeats={selectedSeats} onToggle={toggleSeat} /> : <SeatRows rows={12} startRow={20} markers={[0]} selectedSeats={selectedSeats} onToggle={toggleSeat} />}
        </div>
      )}
      <p className="seat-selection-status" aria-live="polite">{selectedSeats.size ? `${selectedSeats.size} koltuk seçildi: ${Array.from(selectedSeats).join(", ")}` : "Koltuk seçilmedi"}</p>
    </aside>
  );
}

export function FlightSearchPage() {
  const [selectedFlight, setSelectedFlight] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => new Date(new Date().getFullYear(), 0, 29));
  const [flightListCollapsed, setFlightListCollapsed] = useState(false);
  const [seatMapCollapsed, setSeatMapCollapsed] = useState(false);
  const [flightInfoExpanded, setFlightInfoExpanded] = useState(false);
  const flightSidebarRef = useRef<HTMLElement | null>(null);
  const contentBodyRef = useRef<HTMLDivElement | null>(null);
  const dateKey = toIsoDateString(selectedDate);
  const flights = useMemo(() => createRandomizedFlights(dateKey), [dateKey]);
  const passengersByFlight = useMemo(() => flights.reduce<Record<string, PassengerRecord[]>>((allPassengers, item) => {
    allPassengers[item.code] = createPassengersForFlight(item);
    return allPassengers;
  }, {}), [flights]);
  const flight = flights[selectedFlight] ?? flights[0];
  const passengers = passengersByFlight[flight.code] ?? [];

  useEffect(() => {
    setFlightInfoExpanded(false);
  }, [selectedFlight]);

  useEffect(() => {
    setSelectedFlight(0);
    setFlightInfoExpanded(false);
  }, [dateKey]);

  useEffect(() => {
    const sidebar = flightSidebarRef.current;
    const contentBody = contentBodyRef.current;
    if (!sidebar || !contentBody) return;
    const sidebarWidth = getFlightSidebarWidthValue();
    const transform = flightListCollapsed ? `translate3d(${-(sidebarWidth + FLIGHT_SIDEBAR_OVERDRAW)}px,0,0)` : "translate3d(0,0,0)";
    const marginLeft = flightListCollapsed ? "0px" : `${sidebarWidth}px`;

    sidebar.style.transform = transform;
    contentBody.style.marginLeft = marginLeft;

    const handleResize = () => {
      const nextSidebarWidth = getFlightSidebarWidthValue();
      const previousSidebarTransition = sidebar.style.transition;
      const previousBodyTransition = contentBody.style.transition;
      sidebar.style.transition = "none";
      contentBody.style.transition = "none";
      sidebar.style.transform = flightListCollapsed ? `translate3d(${-(nextSidebarWidth + FLIGHT_SIDEBAR_OVERDRAW)}px,0,0)` : "translate3d(0,0,0)";
      contentBody.style.marginLeft = flightListCollapsed ? "0px" : `${nextSidebarWidth}px`;
      void sidebar.offsetHeight;
      sidebar.style.transition = previousSidebarTransition;
      contentBody.style.transition = previousBodyTransition;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [flightListCollapsed]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tagName = target.tagName;
      return target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    };

    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setFlightListCollapsed((current) => !current);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSeatMapCollapsed((current) => !current);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFlightInfoExpanded(true);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setFlightInfoExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, []);

  return (
    <div className={`qc-app allow-flightlist-motion ${flightListCollapsed ? "flight-list-collapsed" : ""} ${seatMapCollapsed ? "seatmap-collapsed" : ""}`}>
      <TopBar />
      <div className="qc-main-row">
        <AppRail collapsed={flightListCollapsed} onToggle={() => setFlightListCollapsed((current) => !current)} />
        <div className="qc-content-shell">
          <FlightList
            flights={flights}
            selected={selectedFlight}
            onSelect={setSelectedFlight}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            collapsed={flightListCollapsed}
            panelRef={flightSidebarRef}
          />
          <div ref={contentBodyRef} className="qc-content-body">
            <main className={`workspace ${flightInfoExpanded ? "flight-info-expanded" : ""}`}>
              <FlightOverview flight={flight} passengers={passengers} expanded={flightInfoExpanded} onExpandedChange={setFlightInfoExpanded} />
              <PassengerTable passengers={passengers} />
            </main>
            <SeatMap collapsed={seatMapCollapsed} onCollapsedChange={setSeatMapCollapsed} />
          </div>
        </div>
      </div>
    </div>
  );
}
