"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Drawing } from "@/lib/supabase";
import DrawingCard from "@/components/DrawingCard";

export default function Gallery() {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  // no modal selected drawing anymore - we navigate to a dedicated page
  // downloading state removed: not used
  const [themeTitle, setThemeTitle] = useState<string | null>(null);

  // Télécharge une image à partir de l'objet Drawing
  async function downloadImage(drawing: Drawing) {
    try {
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
      console.error("Erreur de téléchargement:", err);
      // Optionally: show toast/alert
    } finally {
      // no downloading state to reset
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
            <DrawingCard key={drawing.id} drawing={drawing} onDownload={(d) => void downloadImage(d)} />
          ))}
        </div>
      )}

      {/* Thumbnails now link to the dedicated drawing page */}
    </div>
  );
}
