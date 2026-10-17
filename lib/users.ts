import "server-only";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { isUniqueViolation } from "./api-utils";
import type { CurrentUser } from "./auth";
import type { CreateUserInput, ListUsersInput, UpdateUserInput } from "./validation/user";

export class UserError extends Error {
  constructor(
    message: string,
    public status = 409,
    public fieldErrors?: Record<string, string[]>,
    public code?: string,
  ) {
    super(message);
  }
}

/** Everything the UI/API may see. Never includes passwordHash (or the internal sessionVersion). */
export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserDTO = Prisma.UserGetPayload<{ select: typeof userSelect }>;

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function listUsers(f: ListUsersInput) {
  const where: Prisma.UserWhereInput = {
    ...(f.q
      ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] }
      : {}),
    ...(f.role ? { role: f.role } : {}),
    ...(f.status === "active" ? { active: true } : f.status === "inactive" ? { active: false } : {}),
  };
  const users = await prisma.user.findMany({ where, select: userSelect, orderBy: [{ active: "desc" }, { name: "asc" }] });
  return { users, total: users.length };
}

const emailTaken = (email: string) =>
  new UserError(`The email "${email}" is already used by another user`, 409, { email: ["This email is already in use"] }, "EMAIL_TAKEN");

async function assertEmailFree(tx: Prisma.TransactionClient, email: string, exceptId?: string) {
  const dup = await tx.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (dup) throw emailTaken(email);
}

function rethrowUnique(e: unknown, email?: string): never {
  if (email && isUniqueViolation(e, "email")) throw emailTaken(email);
  throw e;
}

/**
 * Serialises every change that could affect "is there still an active admin?" (role changes, deactivation),
 * so two admins demoting/deactivating each other at the same moment can't leave the shop with none.
 */
async function lockAdminGuard(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('ringup:user-admin-guard'))`;
}

export async function createUser(data: CreateUserInput): Promise<UserDTO> {
  const passwordHash = await hashPassword(data.password);
  try {
    return await prisma.$transaction(async (tx) => {
      await assertEmailFree(tx, data.email);
      return tx.user.create({
        data: { name: data.name, email: data.email, role: data.role, passwordHash },
        select: userSelect,
      });
    });
  } catch (e) {
    rethrowUnique(e, data.email);
  }
}

export async function getUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
}

/**
 * Edit name/email/role and activate/deactivate. Safety rules (server-side):
 *  - an admin can't deactivate or change the role of their own account;
 *  - a protected account can never be deactivated or demoted by another admin;
 *  - the last active ADMIN can never be deactivated or demoted.
 * A role change or deactivation bumps sessionVersion, which signs that user out everywhere.
 */
export async function updateUser(actor: CurrentUser, id: string, patch: UpdateUserInput): Promise<UserDTO> {
  try {
    return await prisma.$transaction(async (tx) => {
      await lockAdminGuard(tx);
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true, protected: true } });
      if (!target) throw new UserError("User not found", 404);

      const isSelf = target.id === actor.id;
      const roleChanging = patch.role !== undefined && patch.role !== target.role;
      const deactivating = patch.active === false && target.active;

      if (isSelf && deactivating) {
        throw new UserError("You can't deactivate your own account. Ask another admin to do it.", 409, { active: ["You can't deactivate yourself"] }, "SELF_DEACTIVATE");
      }
      if (isSelf && roleChanging) {
        throw new UserError("You can't change your own role. Ask another admin to do it.", 409, { role: ["You can't change your own role"] }, "SELF_DEMOTE");
      }
      if (target.protected && (deactivating || roleChanging)) {
        throw new UserError(
          `${target.name} is protected and cannot be ${deactivating ? "deactivated" : "demoted"}.`,
          409,
          deactivating ? { active: ["This account is protected and cannot be deactivated"] } : { role: ["This account is protected and cannot be demoted"] },
          "PROTECTED_ADMIN",
        );
      }
      if (target.role === "ADMIN" && target.active && (deactivating || roleChanging)) {
        const otherActiveAdmins = await tx.user.count({ where: { role: "ADMIN", active: true, NOT: { id: target.id } } });
        if (otherActiveAdmins === 0) {
          const what = deactivating ? "deactivated" : "demoted";
          throw new UserError(
            `${target.name} is the last active admin and can't be ${what}. Make another user an admin first.`,
            409,
            deactivating ? { active: ["The last active admin can't be deactivated"] } : { role: ["The last active admin can't be demoted"] },
            "LAST_ADMIN",
          );
        }
      }
      if (patch.email !== undefined && patch.email !== target.email) await assertEmailFree(tx, patch.email, target.id);

      const invalidateSessions = roleChanging || deactivating;
      return tx.user.update({
        where: { id: target.id },
        data: { ...patch, ...(invalidateSessions ? { sessionVersion: { increment: 1 } } : {}) },
        select: userSelect,
      });
    });
  } catch (e) {
    rethrowUnique(e, patch.email);
  }
}

/** Admin sets a new password. Bumps sessionVersion, so every existing session of that user is signed out. */
export async function resetPassword(id: string, password: string) {
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new UserError("User not found", 404);
  const passwordHash = await hashPassword(password);
  const updated = await prisma.user
    .update({ where: { id }, data: { passwordHash, sessionVersion: { increment: 1 } }, select: { ...userSelect, sessionVersion: true } })
    .catch((e: { code?: string }) => {
      if (e?.code === "P2025") throw new UserError("User not found", 404); // deleted meanwhile
      throw e;
    });
  const { sessionVersion, ...user } = updated;
  return { user, sessionVersion };
}
