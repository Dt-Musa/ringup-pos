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

export const FIX_FIELDS = "Please fix the highlighted fields.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quick client-side checks (the API validates again). Returns only the fields that have a problem. */
export function validateUserForm(v: { name: string; email: string; password?: string; confirm?: string }): FieldErrors {
  const errs: FieldErrors = {};
  if (!v.name.trim()) errs.name = ["Name is required"];
  if (!v.email.trim()) errs.email = ["Email is required"];
  else if (!EMAIL_RE.test(v.email.trim())) errs.email = ["Enter a valid email address"];
  if (v.password !== undefined) {
    const problem = passwordProblem(v.password);
    if (problem) errs.password = [problem];
  }
  if (v.confirm !== undefined) {
    if (!v.confirm) errs.confirm = ["Please confirm the password"];
    else if (v.confirm !== v.password) errs.confirm = ["Passwords don't match"];
  }
  return errs;
}

/** Banner text for a failed save: generic when the problems are shown next to the fields (400), else the API message. */
export function bannerFor(status: number, data: { error?: string; fieldErrors?: FieldErrors }, fallback: string) {
  if (status === 400 && data.fieldErrors && Object.keys(data.fieldErrors).some((k) => k !== "_")) return FIX_FIELDS;
  return data.error ?? fallback;
}
