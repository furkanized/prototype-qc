import { createElement, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { defineCustomElement as defineTkIcon } from "@takeoff-ui/core/components/tk-icon.js";
import { defineCustomElement as defineTkButton } from "@takeoff-ui/core/components/tk-button.js";
import { defineCustomElement as defineTkInput } from "@takeoff-ui/core/components/tk-input.js";
import { defineCustomElement as defineTkCheckbox } from "@takeoff-ui/core/components/tk-checkbox.js";
import { defineCustomElement as defineTkSpinner } from "@takeoff-ui/core/components/tk-spinner.js";
import qcMark from "../../assets/qc-mark.svg";
import qcText from "../../assets/qc-text.svg";

defineTkIcon();
defineTkButton();
defineTkInput();
defineTkCheckbox();
defineTkSpinner();

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
  const props: Record<string, unknown> = {
    icon,
    iconType: "rounded",
    fill,
    sign,
    className: `qc-icon ${className}`,
    "aria-hidden": true,
  };

  if (typeof size === "number") {
    props.style = { fontSize: `${size}px` };
  } else {
    props.size = size;
  }

  if (variant) {
    props.variant = variant;
  }

  return createElement("tk-icon", props);
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

const flights = [
  { code: "TK2070", route: "IST  ›  AMS", time: "14:30", state: "FO", tone: "green", gate: "32", boardingTime: "17:00", arrivalTime: "20:30", seats: "100", regNo: "GRDE6/ N63", announceTime: "17:30" },
  { code: "TK0706", route: "IST  ›  KBL", time: "15:20/15:55", state: "FO", tone: "green", gate: "18", boardingTime: "16:10", arrivalTime: "22:15", seats: "86", regNo: "TC-LAM / A321", announceTime: "16:40" },
  { code: "TK2911", route: "IST  ›  SFO", time: "16:55", state: "FH", tone: "yellow", gate: "11", boardingTime: "18:25", arrivalTime: "23:50", seats: "74", regNo: "TC-JET / B787", announceTime: "18:05" },
];

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

const passengersByFlight = {
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

type Passenger = typeof passengersByFlight[keyof typeof passengersByFlight][number];

function Logo() {
  return <div className="qc-logo" aria-label="QC"><img src={qcMark} alt="" /><img src={qcText} alt="" /></div>;
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
      <button className="bare-button notification" aria-label="Bildirimler"><span className="notification-bell" aria-hidden="true" /><i /></button>
      <button className="profile" aria-label="Profil"><span className="profile-head" /><span className="profile-body" /></button>
    </header>
  );
}

function AppRail() {
  return (
    <aside className="app-rail" aria-label="Uygulama menüsü">
      <button className="rail-collapse" aria-label="Menüyü daralt"><Icon icon="chevron_left" size={22} /></button>
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

function FlightList({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return (
    <aside className="flight-sidebar">
      <div className="flight-title"><h2>Flight List</h2><button aria-label="Uçuş listesi seçenekleri"><Icon icon="more_horiz" size={22} /></button></div>
      <div className="date-picker"><button aria-label="Önceki gün"><Icon icon="chevron_left" size={20} /></button><span>29 Jan</span><button aria-label="Sonraki gün"><Icon icon="chevron_right" size={20} /></button></div>
      <label className="sidebar-label">Select<sup>*</sup></label>
      <button className="terminal-select">Terminal <Icon icon="keyboard_arrow_up" size={17} /></button>
      <label className="sidebar-label search-label">Search<sup>*</sup></label>
      <label className="flight-search"><input defaultValue="IST" aria-label="Uçuş ara" /><Icon icon="search" size={19} /></label>
      <div className="flight-items">
        {flights.map((flight, index) => (
          <button key={flight.code} className={`flight-item ${selected === index ? "selected" : ""}`} onClick={() => onSelect(index)}>
            <span className="flight-line"><b>{flight.code}</b><em className={flight.tone}>{flight.state}</em></span>
            <span className="flight-line"><FlightRoute route={flight.route} /><time className={index === 1 ? "delayed" : ""}>{flight.time}</time></span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function FlightOverview({ flight }: { flight: typeof flights[number] }) {
  return (
    <section className="flight-overview">
      <div className="overview-head">
        <div className="overview-title">
          <Icon icon="flight" size={25} fill />
          <strong>{flight.code}</strong>
          <span>19 FEB <b>{flight.time}</b> /14:45</span>
          <FlightRoute route={flight.route} className="overview-route blue" />
          <em>Flight Open</em>
        </div>
        <button aria-label="Uçuş seçenekleri"><Icon icon="more_horiz" size={23} /></button>
      </div>
      <div className="cabin-counts"><span>Economy 150</span><span>Business 50</span><span>Total Passenger 200</span></div>
      <div className="passenger-progress">
        <div className="checked-progress"><span><Icon icon="expand_circle_down" size={18} />Passengers</span><span>100 Checked-In <Icon icon="person" size={17} fill /></span></div>
        <div className="booked-progress"><span>100 Booked <Icon icon="person" size={17} fill /></span></div>
        <span className="remaining">300 Seats Remain</span>
      </div>
      <div className="flight-facts">
        <div><small>Gate <Icon icon="edit" size={14} /></small><b>{flight.gate}</b></div>
        <div><small>Boarding Time <Icon icon="edit" size={14} /></small><b>{flight.boardingTime}</b></div>
        <div><small>Arrival Time</small><b>{flight.arrivalTime}</b></div>
        <div><small>Kalan Koltuk</small><b className="link">{flight.seats}</b></div>
        <div><small>Reg No/ Uçak Tipi <Icon icon="edit" size={14} /></small><b>{flight.regNo}</b></div>
        <div><small>Anons Zamanı</small><b className="danger">{flight.announceTime}</b></div>
      </div>
      <button className="more-overview">More <Icon icon="keyboard_arrow_down" size={14} /></button>
    </section>
  );
}

function Avatar({ type }: { type: string }) {
  return <span className={`avatar ${type}`}><span className="avatar-head" /><span className="avatar-body" /></span>;
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
  const extraWeightKg = extraPieceCount * 10;
  const totalWeightKg = poolMetrics.kilograms + extraWeightKg;
  const overweightKg = Math.max(0, totalWeightKg - baggageLimitKg);
  const extraPiecePrice = extraPieceCount * 125;
  const extraWeightPrice = extraPieceCount * 125;
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
              <Avatar type={passenger.avatar} />
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
  selectedPassengers,
  onClose,
  onConfirm,
}: {
  selectedPassengers: Passenger[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [checkedPassengers, setCheckedPassengers] = useState(() => new Set(selectedPassengers.map((passenger) => passenger.pnr)));

  useEffect(() => {
    setCheckedPassengers(new Set(selectedPassengers.map((passenger) => passenger.pnr)));
  }, [selectedPassengers]);

  if (selectedPassengers.length === 0) return null;

  return (
    <div className="checkin-overlay" role="dialog" aria-modal="true" aria-labelledby="checkin-title">
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
                  <Avatar type={passenger.avatar} />
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
  amount,
  responsible,
  onClose,
  onPaymentComplete,
}: {
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

  return (
    <div className="payment-overlay" role="dialog" aria-modal="true" aria-labelledby="payment-title">
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
  selectedPassengers,
  onClose,
  onSuccess,
}: {
  selectedPassengers: Passenger[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [headPassengerPnr, setHeadPassengerPnr] = useState(selectedPassengers[0]?.pnr ?? "");
  const [step, setStep] = useState<"Head of Pool" | "Creating Pool" | "Overweight" | "Paid" | "Processing Pool">("Head of Pool");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [paymentPopupOpen, setPaymentPopupOpen] = useState(false);
  const [bagCount, setBagCount] = useState(() => getPoolMetrics(selectedPassengers).pieces);
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

  if (selectedPassengers.length === 0) return null;

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
    <div className="pool-overlay" role="dialog" aria-modal="true" aria-labelledby="pool-title">
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
                          <Avatar type={passenger.avatar} />
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
    {paymentPopupOpen && (
      <ExcessBaggagePaymentPopup
        amount={formatEuro(chargeMetrics.extraPiecePrice + chargeMetrics.extraWeightPrice)}
        responsible={passengerFullName(headPassenger)}
        onClose={() => setPaymentPopupOpen(false)}
        onPaymentComplete={() => {
          setPaymentPopupOpen(false);
          setPaymentCompleted(true);
          setStep("Paid");
        }}
      />
    )}
    </>
  );
}

function PassengerTable({ passengers }: { passengers: Passenger[] }) {
  const [selectedRowsState, setSelectedRowsState] = useState<boolean[]>(passengers.map(() => false));
  const [checkInOverlayOpen, setCheckInOverlayOpen] = useState(false);
  const [poolOverlayOpen, setPoolOverlayOpen] = useState(false);
  const [floatingBarMode, setFloatingBarMode] = useState<"selection" | "checkin-completed" | "pool-success" | "pool-error">("selection");
  const [query, setQuery] = useState(passengers[0]?.surname === "AYIN" ? "AYIN" : "");
  useEffect(() => {
    setSelectedRowsState(passengers.map(() => false));
    setCheckInOverlayOpen(false);
    setPoolOverlayOpen(false);
    setFloatingBarMode("selection");
    setQuery(passengers[0]?.surname === "AYIN" ? "AYIN" : "");
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
            <label className="passenger-search"><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Yolcu ara" /><Icon icon="search" size={19} /></label>
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
                <span className="passenger-name"><Avatar type={person.avatar} />{person.name}</span>
                <span>{person.surname}</span><span>{person.group}</span><span>{person.seat}</span>
                <span className={`bag ${person.baggage} baggage-cell`}>
                  <Icon icon="luggage" size={21} fill />{person.baggage === "alert" && <i>!</i>}
                </span>
                <span className={`apis ${person.apis}`}><b>A</b></span>
                <span><em className={`tier ${person.tier.toLowerCase()}`}>{person.tier}</em></span><span>Y/ EC</span>
                <span className={`message ${person.message ? "active" : ""}`}><Icon icon="chat" size={19} fill />{person.message > 0 && <i>{person.message}</i>}</span>
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
      {checkInOverlayOpen && <PassengerCheckInOverlay selectedPassengers={selectedPassengers} onClose={() => setCheckInOverlayOpen(false)} onConfirm={completeCheckIn} />}
      {poolOverlayOpen && <CreatePoolOverlay selectedPassengers={selectedPassengers} onClose={() => setPoolOverlayOpen(false)} onSuccess={completePool} />}
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
  const [seatMapCollapsed, setSeatMapCollapsed] = useState(false);
  const flight = flights[selectedFlight];
  const passengers = passengersByFlight[flight.code] ?? [];
  return (
    <div className={`qc-app ${seatMapCollapsed ? "seatmap-collapsed" : ""}`}>
      <TopBar />
      <AppRail />
      <FlightList selected={selectedFlight} onSelect={setSelectedFlight} />
      <main className="workspace"><FlightOverview flight={flight} /><PassengerTable passengers={passengers} /></main>
      <SeatMap collapsed={seatMapCollapsed} onCollapsedChange={setSeatMapCollapsed} />
    </div>
  );
}
