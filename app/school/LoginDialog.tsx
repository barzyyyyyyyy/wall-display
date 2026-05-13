"use client";

import { useState } from "react";
import type { Sibling } from "@/lib/types";

type Props = {
  initial: Sibling | null;
  onCancel: () => void;
  onSave: (sibling: Sibling) => void;
};

export default function LoginDialog({ initial, onCancel, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");

  const canSave =
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave({
            name: name.trim(),
            username: username.trim(),
            password,
          });
        }}
        className="w-full max-w-md rounded-3xl bg-neutral-900/90 backdrop-blur-xl ring-1 ring-white/10 p-8"
      >
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          התחברות לוובטופ
        </h2>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm text-white/60">שם להצגה</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: נועה"
            autoFocus
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-lg outline-none focus:bg-white/15"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm text-white/60">
            שם משתמש בוובטופ
          </span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-lg outline-none focus:bg-white/15 text-right"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1.5 block text-sm text-white/60">סיסמה</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className="w-full rounded-xl bg-white/10 px-4 py-3 text-lg outline-none focus:bg-white/15 text-right"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/10 px-5 py-2.5 text-base hover:bg-white/20"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-full bg-white px-5 py-2.5 text-base font-medium text-neutral-950 hover:bg-white/90 disabled:opacity-40"
          >
            שמור
          </button>
        </div>
      </form>
    </div>
  );
}
