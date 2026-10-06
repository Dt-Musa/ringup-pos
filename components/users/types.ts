import type { Role } from "@/lib/permissions";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string; // ISO
  lastLoginAt: string | null; // ISO
};
