"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Theme } from "@/lib/supabase";

export default function DailyTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<{
    id: string;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
  }[]>([]);
  const [timeLeft, setTimeLeft] = useState("");

  // helper to get current hour in Europe/Paris timezone
  const getParisHour = () => {
    try {
      const now = new Date();
      const paris = new Date(
        now.toLocaleString("en-GB", { timeZone: "Europe/Paris" })
      );
      return paris.getHours();
    } catch {
      // fallback to local hour if timezone conversion fails
      return new Date().getHours();
    }
  };

  useEffect(() => {
    fetchTodayTheme();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayTheme = async () => {
    try {
      const today = new Date().toLocaleDateString("fr-CA"); // format YYYY-MM-DD
      console.log(today);
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .eq("date", today)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Erreur lors du chargement du thème:", error);
      } else {
        setTheme(data);
        // fetch participants (users who submitted a drawing for this theme)
        try {
          type DrawingsUsersRow = {
            user_id: string;
            user: { id: string; name?: string | null; email: string } | null;
          };

          const { data: drawingsUsers } = await supabase
            .from("drawings")
            .select(`user_id, user:users(id, name, email)`)
            .eq("theme_id", data.id)
            .order("created_at", { ascending: true });

          if (drawingsUsers && Array.isArray(drawingsUsers)) {
            // map unique users preserving order
            const seen = new Set<string>();
            const rows = drawingsUsers as unknown as DrawingsUsersRow[];
            const users = rows
              .map((d) => {
                const raw = d.user as unknown;
                // Supabase can return joined rows either as an object or as a one-element array
                if (Array.isArray(raw)) return raw[0] ?? null;
                return raw as (DrawingsUsersRow["user"] | null);
              })
              .filter((u): u is { id: string; name?: string | null; email: string } => {
                if (!u) return false;
                if (seen.has(u.id)) return false;
                seen.add(u.id);
                return true;
              })
              .map((u) => ({ id: u.id, name: u.name, email: u.email }));

            setParticipants(users);
          } else {
            setParticipants([]);
          }
        } catch (fetchErr) {
          console.error("Erreur fetch participants:", fetchErr);
          setParticipants([]);
        }
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeLeft = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diff = midnight.getTime() - now.getTime();

    if (diff <= 0) {
      setTimeLeft("Le concours est terminé !");
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
  };

  if (loading) {
    return (
      <div className="card card-hover p-6 mb-6">
        <div className="space-y-3">
          <div className="h-6 w-1/3 skeleton"></div>
          <div className="h-4 w-1/2 skeleton"></div>
        </div>
      </div>
    );
  }

  if (!theme) {
    // If current Paris hour is between 0 and 6, hide theme and show rendez-vous message
    const parisHour = getParisHour();
    if (parisHour >= 0 && parisHour < 6) {
      return (
        <div className="card card-hover p-6 mb-6">
          <h2 className="text-xl font-extrabold mb-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Rendez-vous demain
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Rendez-vous demain 6h pour une nouveau thème !
          </p>
        </div>
      );
    }

    return (
      <div className="card card-hover p-6 mb-6">
        <h2 className="text-xl font-extrabold mb-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          {"Pas de thème aujourd'hui"}
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          {"Aucun thème n'est défini pour aujourd'hui. Revenez demain !"}
        </p>
      </div>
    );
  }

  const parisHour = getParisHour();
  const isContestEnded = false; // keep original contest end logic elsewhere

  // If current Paris hour is between 0 and 6, show rendez-vous message instead of theme
  if (parisHour >= 0 && parisHour < 6) {
    return (
      <div className="card card-hover p-6 mb-6">
        <h2 className="text-xl font-extrabold mb-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Rendez-vous demain
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
          Rendez-vous demain 6h pour une nouveau thème !
        </p>
      </div>
    );
  }

  return (
    <div className="card card-hover p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Thème du jour
          </h2>
          <h3 className="text-lg sm:text-xl font-semibold text-violet-600 dark:text-violet-300 mb-2">
            {theme.title}
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-4">
            {theme.description}
          </p>
        </div>
        <div className="text-left sm:text-right mt-2 sm:mt-0">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Participants</div>
          <div className="flex items-center justify-end gap-2">
            <div className="flex -space-x-2">
              {participants.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-900 bg-slate-200 dark:bg-slate-700 text-xs font-semibold grid place-items-center overflow-hidden"
                  title={p.name || p.email}
                >
                  {p.name ? p.name[0].toUpperCase() : (p.email?.[0] || "U").toUpperCase()}
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">{participants.length} participant{participants.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="text-left sm:text-right mt-2 sm:mt-0">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
            Temps restant
          </div>
          <div
            className={`text-base sm:text-lg font-mono ${isContestEnded ? "text-emerald-600 dark:text-emerald-400" : "text-violet-700 dark:text-violet-300"}`}
          >
            {timeLeft}
          </div>
        </div>
      </div>

      {isContestEnded ? (
        <div className="alert alert-success">
          <p className="font-medium">
            ✅ Le concours est terminé ! Vous pouvez maintenant voir tous les
            dessins.
          </p>
        </div>
      ) : (
        <div className="alert alert-info">
          <p className="font-medium">
            {"⏰ Vous avez jusqu'à minuit pour uploader votre dessin !"}
          </p>
        </div>
      )}
    </div>
  );
}
