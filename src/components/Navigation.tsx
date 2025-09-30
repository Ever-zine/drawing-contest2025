"use client";

import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navigation() {
  const { user, signOut } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Theme init and toggle
  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const enabled = stored ? stored === "dark" : prefersDark;
      document.documentElement.classList.toggle("dark", enabled);
      setIsDark(enabled);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Erreur vérification admin:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data?.is_admin);
      }
    };
    checkAdmin();
  }, [user]);

  const initial = (user?.email?.[0] || "U").toUpperCase();

  return (
    <nav className="glass p-3 sm:p-4 md:p-5 mb-6 sm:mb-8">
      <div className="container-padded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white text-lg shadow-sm">
            🎨
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">
              <span className="bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Concours de Dessin
              </span>
            </h1>
            <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400">
              Crée, partage, découvre
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={toggleTheme}
            className="btn-ghost h-9 px-3"
            aria-label={
              isDark ? "Activer le mode clair" : "Activer le mode sombre"
            }
            title={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          {isAdmin && (
            <Link href="/admin" className="btn-ghost h-9 px-3">
              Admin
            </Link>
          )}
          <Link href="/" className="btn-ghost h-9 px-3">
            Accueil
          </Link>
          <Link href="/historique" className="btn-ghost h-9 px-3">
            Historique
          </Link>

          <div className="flex items-center gap-2 pl-0 sm:pl-2">
            <div className="h-8 w-8 rounded-full bg-violet-600 text-white grid place-items-center font-semibold">
              {initial}
            </div>
            <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300">
              {user?.email}
            </span>
          </div>

          <button onClick={signOut} className="btn-danger h-9 w-full sm:w-auto">
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}
