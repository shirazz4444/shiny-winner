export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center gap-8 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
