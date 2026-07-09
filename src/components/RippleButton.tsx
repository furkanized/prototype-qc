import { useRef, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

// Button with a soft press ripple. Visual variants come from className.
export function RippleButton({ children, className = "", onClick, ...rest }: RippleButtonProps) {
  const ref = useRef<HTMLButtonElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const button = ref.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.className = "qcx-ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 500);
    }
    onClick?.(event);
  };

  return (
    <button ref={ref} className={`qcx-ripple-host ${className}`.trim()} onClick={handleClick} {...rest}>
      {children}
    </button>
  );
}
