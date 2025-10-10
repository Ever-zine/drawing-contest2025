import React from "react";

type Props = {
  user: { id: string; email: string; name?: string; created_at?: string };
  drawingsCount?: number;
};

export default function ProfileHeader({ user, drawingsCount = 0 }: Props) {
  const initials = (user.name || user.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="card card-hover p-6 flex items-center gap-6">
      <div className="flex-shrink-0">
        <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-2xl font-bold text-slate-700 dark:text-slate-100">{initials}</div>
      </div>

      <div className="flex-1">
        <h1 className="text-2xl font-extrabold">{user.name || user.email}</h1>
  <p className="text-sm text-slate-600 mt-1">Membre depuis {new Date(user.created_at ?? Date.now()).toLocaleDateString('fr-FR')}</p>
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-700 dark:text-slate-300">
          <div><span className="font-semibold">{drawingsCount}</span> dessin{drawingsCount > 1 ? 's' : ''}</div>
        </div>
      </div>

      <div>
        <button className="btn btn-outline">Suivre</button>
      </div>
    </header>
  );
}
