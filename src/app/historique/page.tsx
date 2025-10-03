"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Drawing } from "@/lib/supabase";
import Link from "next/link";
import ReactionPreview from "@/components/ReactionPreview";

type DrawingWithRelations = Drawing & {
  theme?: {
    title?: string | null;
    date?: string | null;
  } | null;
};

type DayGroup = {
  date: string; // YYYY-MM-DD
  themeTitle: string | null;
  drawings: DrawingWithRelations[];
};

export default function HistoriquePage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [groups, setGroups] = useState<DayGroup[]>([]);
  // removed modal state: we navigate to the dedicated drawing page instead
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchAllDrawings();
  }, []);

  const fetchAllDrawings = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const today = new Date().toLocaleDateString("fr-CA");
      const { data, error } = await supabase
        .from("drawings")
        .select(
          `
          *,
          user:users(email, name),
          theme:themes(title, date)
        `,
        )
        .lt("created_at", today)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg("Impossible de charger l'historique des dessins.");
        // eslint-disable-next-line no-console
        console.error("Erreur Supabase (historique):", error);
        setGroups([]);
        return;
      }

      const drawings = (data || []) as DrawingWithRelations[];

      const byDate = new Map<string, DayGroup>();

      for (const d of drawings) {
        const normalizedDate =
          (d.theme?.date ?? toYMD(d.created_at)) || toYMD(d.created_at);

        const themeTitle = d.theme?.title ?? null;

        if (!byDate.has(normalizedDate)) {
          byDate.set(normalizedDate, {
            date: normalizedDate,
            themeTitle,
            drawings: [d],
          });
        } else {
          const group = byDate.get(normalizedDate)!;
          group.drawings.push(d);
          // Conserver un titre si on le découvre plus tard
          if (!group.themeTitle && themeTitle) {
            group.themeTitle = themeTitle;
          }
        }
      }

      // Trier par date décroissante
      const sorted = Array.from(byDate.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setGroups(sorted);
    } catch (err) {
      setErrorMsg("Une erreur est survenue pendant le chargement.");
      // eslint-disable-next-line no-console
      console.error("Erreur (historique):", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = useMemo(
    () => groups.reduce((acc, g) => acc + g.drawings.length, 0),
    [groups],
  );

  // Télécharge une image donnée et nomme le fichier de façon lisible
  async function downloadImage(drawing: { id: string; image_url: string; title?: string | null }) {
    try {
      setDownloadingId(drawing.id);
      const res = await fetch(drawing.image_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeTitle = (drawing.title || "dessin").replace(/[^a-z0-9-_\.]/gi, "_");
      const extMatch = (drawing.image_url || "").match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
      const ext = extMatch ? extMatch[1] : blob.type.split("/").pop() || "png";
      a.href = url;
      a.download = `${safeTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Erreur de téléchargement:", err);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="container-padded py-8">
      <div className="card card-hover p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Historique des dessins
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Retrouvez ici tous les dessins publiés, regroupés par jour avec le
              thème associé.
            </p>
          </div>
          {!loading && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {totalCount} dessin{totalCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, gi) => (
            <div key={gi} className="card card-hover p-6">
              <div className="h-6 w-1/3 skeleton mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(6)].map((__, i) => (
                  <div key={i} className="space-y-2">
                    <div className="skeleton h-48 rounded-lg mb-2"></div>
                    <div className="skeleton h-4 w-3/4 mb-1"></div>
                    <div className="skeleton h-3 w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : errorMsg ? (
        <div className="card card-hover p-6">
          <div className="alert alert-error">
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="card card-hover p-6">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🗓️</div>
            <p className="text-slate-600 dark:text-slate-300">
              Aucun dessin n&apos;a encore été soumis.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.date} className="card card-hover p-6">
              <header className="mb-4">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                  {formatFR(group.date)}{" "}
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    — Thème: {" "}
                    {group.themeTitle ? group.themeTitle : "Thème inconnu"}
                  </span>
                </h2>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.drawings.map((drawing) => (
                  <div key={drawing.id} className="card card-hover overflow-hidden">
                    <div className="aspect-square relative overflow-hidden">
                        <Link href={`/drawing/${drawing.id}`} className="block w-full h-full">
                          <img
                            src={drawing.image_url}
                            alt={drawing.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                          />
                        </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadImage(drawing);
                        }}
                        className="absolute top-2 right-2 btn btn-xs"
                        title="Télécharger"
                      >
                        ⬇️
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                        {drawing.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                        par {drawing.user?.name || drawing.user?.email}
                      </p>
                      {drawing.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                          {drawing.description}
                        </p>
                      )}
                      <ReactionPreview drawingId={drawing.id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Clicking a drawing now opens the dedicated page */}
    </div>
  );
}

/**
 * Convertit un timestamp en chaîne YYYY-MM-DD (UTC)
 */
function toYMD(dateInput: string | number | Date): string {
  const d = new Date(dateInput);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Formate YYYY-MM-DD en date FR longue
 */
function formatFR(ymd: string): string {
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
