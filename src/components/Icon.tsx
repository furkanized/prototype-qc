// Material Symbols glyph, reusing the .qc-icon font setup from the prototype styles.
export function Icon({ icon, size = 20, fill = false, className = "" }: { icon: string; size?: number; fill?: boolean; className?: string }) {
  return (
    <span
      className={`qc-icon ${className}`.trim()}
      aria-hidden="true"
      style={{
        fontSize: `${size}px`,
        fontVariationSettings: fill ? '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24' : '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
      }}
    >
      {icon}
    </span>
  );
}
