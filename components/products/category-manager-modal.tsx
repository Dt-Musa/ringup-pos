"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, Modal } from "@/components/ui/modal";
import type { CategoryOption } from "./types";

export function CategoryManagerModal({ categories, onClose }: { categories: CategoryOption[]; onClose: () => void }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: string, name: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save the category");
      return false;
    }
    router.refresh();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await send("/api/categories", "POST", newName)) setNewName("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId && (await send(`/api/categories/${editingId}`, "PATCH", editName))) setEditingId(null);
  }

  return (
    <Modal title="Categories" onClose={onClose}>
      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={add} className="flex gap-2">
        <input
          name="newCategory"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          maxLength={50}
          className={`${inputCls} mt-0`}
          aria-label="New category name"
        />
        <button type="submit" disabled={busy || !newName.trim()} className={btnPrimary}>
          Add
        </button>
      </form>

      <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800" data-testid="category-list">
        {categories.length === 0 && <li className="py-4 text-sm text-zinc-500">No categories yet.</li>}
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            {editingId === c.id ? (
              <form onSubmit={saveEdit} className="flex flex-1 gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={50}
                  className={`${inputCls} mt-0`}
                  aria-label={`Rename ${c.name}`}
                />
                <button type="submit" disabled={busy || !editName.trim()} className={btnPrimary}>
                  Save
                </button>
                <button type="button" onClick={() => setEditingId(null)} className={btnSecondary}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {c.productCount ?? 0} product{c.productCount === 1 ? "" : "s"}
                  </span>
                </span>
                <button
                  onClick={() => {
                    setEditingId(c.id);
                    setEditName(c.name);
                    setError(null);
                  }}
                  className="text-emerald-700 hover:underline"
                >
                  Rename
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className={btnSecondary}>
          Done
        </button>
      </div>
    </Modal>
  );
}
