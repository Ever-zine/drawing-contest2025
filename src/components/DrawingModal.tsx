"use client";

import React from "react";
import Comments from "@/components/Comments";
import Reactions from "@/components/Reactions";
import type { Drawing } from "@/lib/supabase";

type ThemeInfo = {
  title?: string | null;
  date?: string | null;
};

type Props = {
  drawing: Drawing;
  onClose: () => void;
  onDownload?: (drawing: Drawing) => Promise<void> | void;
  downloadingId?: string | null;
  theme?: ThemeInfo | null;
};

export default function DrawingModal({ drawing, onClose, onDownload, downloadingId, theme }: Props) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="pointer-events-none fixed inset-0 flex items-end md:items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-xl md:rounded-xl shadow-xl overflow-hidden transform transition-transform duration-200 ease-out
            max-h-[95vh] md:max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold leading-tight truncate">{drawing.title}</h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {theme?.date ? `${new Date(theme.date).toLocaleDateString("fr-FR")} — ` : ""}
                Thème: {theme?.title ?? "Inconnu"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => onDownload && (await onDownload(drawing))}
                className="btn btn-sm"
                disabled={!!downloadingId}
              >
                {downloadingId === drawing.id ? "Téléchargement..." : "Télécharger"}
              </button>
              <button
                onClick={onClose}
                className="btn-ghost text-2xl"
                aria-label="Fermer"
                title="Fermer"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 overflow-auto">
            <div className="w-full flex flex-col md:flex-row gap-4">
              <div className="md:flex-1">
                <div className="w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img src={drawing.image_url} alt={drawing.title} className="w-full h-auto object-contain max-h-[60vh] md:max-h-[70vh] block" />
                </div>

                <div className="mt-3 md:hidden">
                  <Reactions drawingId={drawing.id} />
                </div>
              </div>

              <aside className="md:w-80 flex-shrink-0">
                <div className="hidden md:block mb-3">
                  <Reactions drawingId={drawing.id} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Artiste:</span> {drawing.user?.name || drawing.user?.email}
                  </p>
                  {drawing.description && (
                    <p className="text-slate-700 dark:text-slate-200">
                      <span className="font-medium">Description:</span> {drawing.description}
                    </p>
                  )}
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Soumis le {new Date(drawing.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="mt-4">
                  <Comments drawingId={drawing.id} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
