import { type ButtonHTMLAttributes, type ReactNode, useRef } from "react";

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export default function MagneticButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  const base =
    "relative overflow-hidden px-8 py-4 font-semibold text-lg rounded-[var(--radius-inner)] transition-transform duration-200 cursor-pointer";
  const variants = {
    primary: "bg-black text-off-white hover:scale-[1.03]",
    secondary: "bg-off-white text-black border-2 border-black/10 hover:scale-[1.03]",
  };

  return (
    <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
