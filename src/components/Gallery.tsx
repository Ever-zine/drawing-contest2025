"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Drawing } from "@/lib/supabase";

export default function Gallery() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchDrawings();
  }, []);

  const fetchDrawings = async () => {
    try {
      // On veut les dessins du jour précédent en UTC (entre minuit hier et minuit aujourd'hui)
      const now = new Date();
      const utcYear = now.getUTCFullYear();
      const utcMonth = now.getUTCMonth();
      const utcDate = now.getUTCDate();

      // minuit aujourd'hui UTC
      const todayMidnightUTC = new Date(
        Date.UTC(utcYear, utcMonth, utcDate, 0, 0, 0),
      );
      // minuit hier UTC
      const yesterdayMidnightUTC = new Date(
        Date.UTC(utcYear, utcMonth, utcDate - 1, 0, 0, 0),
      );

      const todayISO = todayMidnightUTC.toISOString(); // "2025-10-01T00:00:00.000Z"
      const yesterdayISO = yesterdayMidnightUTC.toISOString(); // "2025-09-30T00:00:00.000Z"

      const { data, error } = await supabase
        .from("drawings")
        .select(
          `
          *,
          user:users(email, name),
          theme:themes(title)
        `,
        )
        .gte("created_at", yesterdayISO)
        .lt("created_at", todayISO)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur lors du chargement des dessins:", error);
      } else {
        setDrawings(data || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  // Téléchargement d'image
  const getDownloadFilename = (d: Drawing) => {
    let ext = "jpg";
    try {
      const u = new URL(d.image_url);
      const last = (u.pathname.split("/").pop() || "").toLowerCase();
      const m = last.match(/\.([a-z0-9]+)$/i);
      if (m) ext = m[1].toLowerCase();
    } catch {
      // ignore
    }
    const baseTitle = (d.title || "dessin")
      .replace(/[^\p{L}\p{N}\-_]+/gu, "_")
      .slice(0, 60);
    return `${baseTitle}.${ext}`;
  };

  const downloadImage = async (d: Drawing) => {
    setDownloading(true);
    try {
      const res = await fetch(d.image_url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename(d);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Téléchargement échoué:", e);
      const a = document.createElement("a");
      a.href = d.image_url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  // const isContestEnded = new Date().getHours() >= 24;

  // if (!isContestEnded) {
  //   return (
  //     <div className="card card-hover p-6 mb-6">
  //       <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
  //         Galerie des dessins
  //       </h2>
  //       <div className="alert alert-info">
  //         <p className="font-medium">
  //           🔒 La galerie sera visible après minuit, quand le concours
  sera;
  //           terminé !
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  if (loading) {
    return (
      <div className="card card-hover p-6 mb-6">
        <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Galerie des dessins
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-48 rounded-lg mb-2"></div>
              <div className="skeleton h-4 w-3/4 mb-1"></div>
              <div className="skeleton h-3 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover p-6 mb-6">
      <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
        Galerie des dessins
      </h2>

      {drawings.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-slate-600 dark:text-slate-300">
            Aucun dessin n&apos;a été soumis pour aujourd&apos;hui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="card card-hover overflow-hidden cursor-pointer"
              onClick={() => setSelectedDrawing(drawing)}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={drawing.image_url}
                  alt={drawing.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal pour voir le dessin en grand */}
      {selectedDrawing && (
        <div className="modal-overlay flex items-center justify-center p-4">
          <div className="modal-card max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-extrabold">
                  {selectedDrawing.title}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadImage(selectedDrawing!)}
                    className="btn btn-primary btn-sm"
                    disabled={downloading}
                    aria-label="Télécharger l'image"
                    title="Télécharger l'image"
                  >
                    {downloading ? "Téléchargement..." : "Télécharger"}
                  </button>
                  <button
                    onClick={() => setSelectedDrawing(null)}
                    className="btn-ghost text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <img
                src={selectedDrawing.image_url}
                alt={selectedDrawing.title}
                className="w-full rounded-lg mb-4"
              />

              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Artiste:</span>{" "}
                  {selectedDrawing.user?.name || selectedDrawing.user?.email}
                </p>
                {selectedDrawing.description && (
                  <p className="text-slate-700 dark:text-slate-200">
                    <span className="font-medium">Description:</span>{" "}
                    {selectedDrawing.description}
                  </p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Soumis le{" "}
                  {new Date(selectedDrawing.created_at).toLocaleDateString(
                    "fr-FR",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
