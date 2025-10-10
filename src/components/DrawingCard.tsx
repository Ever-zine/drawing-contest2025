"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Drawing } from "@/lib/supabase";
import ReactionPreview from "@/components/ReactionPreview";

type Props = {
  drawing: Drawing & { theme?: { date?: string | null } | null };
  className?: string;
  onDownload?: (drawing: Drawing) => void;
};

export default function DrawingCard({ drawing, className = "", onDownload }: Props) {
  const [commentsCount, setCommentsCount] = useState<number | null>(null);

  const ymd = (dateInput: string | number | Date) => {
    const d = new Date(dateInput);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isLate = (() => {
    try {
      const themeDate = drawing.theme?.date;
      if (!themeDate) return false;
  const createdYMD = ymd(drawing.created_at);
  const themeYMD = ymd(themeDate);
  // Compare date-only strings (YYYY-MM-DD). If created date > theme date -> late
  return createdYMD > themeYMD;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const { count, error } = await supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("drawing_id", drawing.id);

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Erreur en récupérant le nombre de commentaires:", error);
          return;
        }

        if (mounted) setCommentsCount(count ?? 0);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }

    void fetchCount();

    return () => {
      mounted = false;
    };
  }, [drawing.id]);

  return (
    <div className={`card card-hover overflow-hidden ${className} ${isLate ? 'ring-2 ring-red-500 animate-pulse-red' : ''}`}>
      <div className="aspect-square relative overflow-hidden">
        {isLate && (
          <div className="absolute top-2 left-2 bg-red-700 text-white px-3 py-1 rounded text-xs font-extrabold flex items-center gap-2 z-10 animate-shake">
            <span>😡</span>
            <span>EN RETARD — C&apos;EST INADMISSIBLE !</span>
          </div>
        )}
        <Link href={`/drawing/${drawing.id}`} className="block w-full h-full">
          <img
            src={drawing.image_url}
            alt={drawing.title ?? "dessin"}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
          />
        </Link>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onDownload) onDownload(drawing);
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

        <div className="mt-3 flex items-center justify-between">
          <ReactionPreview drawingId={drawing.id} />
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {commentsCount == null ? "..." : `${commentsCount} commentaire${commentsCount > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>
    </div>
  );
}
