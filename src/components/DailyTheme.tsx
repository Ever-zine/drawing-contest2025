"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Theme } from "@/lib/supabase";

export default function DailyTheme() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    fetchTodayTheme();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTodayTheme = async () => {
    try {
      const today = new Date().toLocaleDateString("fr-CA"); // format YYYY-MM-DD
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

  const isContestEnded = new Date().getHours() >= 24;

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
