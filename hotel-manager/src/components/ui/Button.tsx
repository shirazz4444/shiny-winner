import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "constructive" | "destructive";
type Size = "md" | "sm" | "xs";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "border border-input bg-card hover:bg-primary/10",
  destructive: "bg-destructive text-white",
  constructive: "bg-constructive",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2",
  sm: "px-3 py-1.5 text-sm",
  xs: "px-2 py-1 text-xs",
};

export function buttonClass(
  variant: Variant = "primary",
  className = "",
  size: Size = "md",
) {
  return `inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${variants[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, className, size)}
      {...props}
    />
  );
}
