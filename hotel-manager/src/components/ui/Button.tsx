import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "border border-input bg-card hover:bg-primary/10",
  destructive: "bg-destructive text-white",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className)}
      {...props}
    />
  );
}
