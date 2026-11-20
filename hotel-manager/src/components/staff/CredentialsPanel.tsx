type CredentialsPanelProps = {
  email: string;
  password: string;
};

export default function CredentialsPanel({
  email,
  password,
}: CredentialsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p>Share these login details with the employee.</p>
      <dl className="grid gap-2 rounded-md bg-muted p-4 sm:grid-cols-[7rem_1fr]">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="break-all">{email}</dd>
        <dt className="text-muted-foreground">Password</dt>
        <dd className="font-mono">{password}</dd>
      </dl>
      <p role="status" className="text-sm font-medium text-warning">
        This password is shown only once and can&apos;t be retrieved later.
      </p>
    </div>
  );
}
