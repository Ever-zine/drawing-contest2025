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
    <div className="modal-overlay flex items-center justify-center p-4">
      <div className="modal-card max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-extrabold">{drawing.title}</h3>
              <div className="text-sm text-slate-500 dark:text-slate-400">
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

          <img
            src={drawing.image_url}
            alt={drawing.title}
            className="w-full rounded-lg mb-4"
          />

          <Reactions drawingId={drawing.id} />

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

          <Comments drawingId={drawing.id} />
        </div>
      </div>
    </div>
  );
}
