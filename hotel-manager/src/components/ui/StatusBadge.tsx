type Tone =
  "success" | "warning" | "info" | "primary" | "destructive" | "neutral";

const toneClasses: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

const statusTones: Record<string, Tone> = {
  // reservation
  PENDING: "warning",
  CONFIRMED: "info",
  CHECKED_IN: "primary",
  CHECKED_OUT: "success",
  CANCELLED: "neutral",
  NO_SHOW: "destructive",
  // room
  AVAILABLE: "success",
  OCCUPIED: "primary",
  CLEANING: "warning",
  MAINTENANCE: "destructive",
  RESERVED: "info",
  // invoice
  DRAFT: "neutral",
  ISSUED: "info",
  PAID: "success",
  REFUNDED: "neutral",
  // housekeeping task
  IN_PROGRESS: "primary",
  COMPLETED: "success",
  // maintenance request
  OPEN: "warning",
  RESOLVED: "success",
  // employee account
  ACTIVE: "success",
  INACTIVE: "neutral",
};

const labelOverrides: Record<string, string> = {
  NO_SHOW: "No-show",
};

function labelOf(status: string): string {
  if (labelOverrides[status]) return labelOverrides[status];
  const text = status.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function StatusBadge({ status }: { status: string }) {
  const tone = statusTones[status] ?? "neutral";

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {labelOf(status)}
    </span>
  );
}
