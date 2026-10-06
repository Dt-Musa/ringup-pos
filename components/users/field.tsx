export const PASSWORD_HINT = "At least 8 characters, with a letter and a number";

export type FieldErrors = Record<string, string[]>;

export function Field({ label, error, children, hint }: { label: string; error?: string[]; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
      {hint && !error && <span className="mt-1 block text-xs font-normal text-zinc-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-normal text-red-600">{error[0]}</span>}
    </label>
  );
}

/** Mirrors the server rule (lib/validation/user.ts) for instant feedback; the API still validates. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(pw)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
  return null;
}
