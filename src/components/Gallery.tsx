"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Drawing } from "@/lib/supabase";
import Comments from "@/components/Comments";
import DrawingModal from "@/components/DrawingModal";

export default function Gallery() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [themeTitle, setThemeTitle] = useState<string | null>(null);

  // Télécharge une image à partir de l'objet Drawing
  async function downloadImage(drawing: Drawing) {
    try {
      setDownloading(drawing.id);
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
      // Optionally: show toast/alert
    } finally {
      setDownloading(null);
    }
  }

  useEffect(() => {
    fetchDrawings();
  }, []);

  const fetchDrawings = async () => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const ymd = d.toLocaleDateString("fr-CA");

      const { data: theme, error: themeError } = await supabase
        .from("themes")
        .select("id, title, date")
        .eq("date", ymd)
        .single();

      if (themeError || !theme) {
        setThemeTitle(null);
        setDrawings([]);
        return;
      }

      setThemeTitle(theme.title ?? null);

      const { data: drawingsData, error: drawingsError } = await supabase
        .from("drawings")
        .select(
          `
    *,
    user:users(email, name),
    theme:themes(title)
  `,
        )
        .eq("theme_id", theme.id)
        .order("created_at", { ascending: false });

      if (drawingsError) {
        console.error("Erreur lors du chargement des dessins:", drawingsError);
      } else {
        setDrawings(drawingsData || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
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
  //           🔒 La galerie sera visible après minuit, quand le concours sera
  //           terminé !
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  if (loading) {
    return (
      <div className="card card-hover p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Galerie des dessins
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton h-40 sm:h-48 rounded-lg mb-2"></div>
              <div className="skeleton h-4 w-3/4 mb-1"></div>
              <div className="skeleton h-3 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover p-4 sm:p-6 mb-6">
      <h2 className="text-lg sm:text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
        Galerie des dessins — Thème: {themeTitle ?? "Inconnu"}
      </h2>

      {drawings.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-slate-600 dark:text-slate-300">
            Aucun dessin n&apos;a été soumis pour hier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="card card-hover overflow-hidden"
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={drawing.image_url}
                  alt={drawing.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                  onClick={() => setSelectedDrawing(drawing)}
                />
                <button
                  onClick={() => downloadImage(drawing)}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal pour voir le dessin en grand */}
      {selectedDrawing && (
        <DrawingModal
          drawing={selectedDrawing}
          theme={themeTitle ? { title: themeTitle } : null}
          onClose={() => setSelectedDrawing(null)}
          onDownload={(d) => downloadImage(d)}
          downloadingId={downloading}
        />
      )}
    </div>
  );
}
