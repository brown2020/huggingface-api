/** Visible notice when a live auth or credit failure returned sample output. */
export function DemoModeBanner({ reason }: { reason: string }) {
  return (
    <div
      className="mt-4 rounded-md border border-amber-400 bg-amber-50 p-4 text-amber-950"
      role="status"
    >
      <p className="font-semibold">Demo mode: sample results</p>
      <p className="mt-1 text-sm">{reason}</p>
    </div>
  );
}
