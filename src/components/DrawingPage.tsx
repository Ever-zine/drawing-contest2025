"use client"

import React, { useEffect, useState } from 'react'
import Comments from '@/components/Comments'
import Reactions from '@/components/Reactions'
import type { Drawing } from '@/lib/supabase'

type Props = {
  drawing: Drawing & { theme?: { title?: string | null; date?: string | null } }
}

export default function DrawingPage({ drawing }: Props) {
  const [mounted, setMounted] = useState(false)

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
  return createdYMD > themeYMD;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    // small entrance animation
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])
  async function downloadImage() {
    try {
      const res = await fetch(drawing.image_url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeTitle = (drawing.title || 'dessin').replace(/[^a-z0-9-_\.]/gi, '_')
      const extMatch = (drawing.image_url || '').match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/)
      const ext = extMatch ? extMatch[1] : blob.type.split('/').pop() || 'png'
      a.href = url
      a.download = `${safeTitle}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erreur de téléchargement:', err)
    }
  }

  return (
  <div className={`card card-hover p-4 md:p-6 transform transition-all duration-300 ease-out ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <aside className="md:col-span-3">
          <div className="sticky top-20">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h1 className="text-lg font-extrabold">{drawing.title}</h1>
                <div className="text-sm text-slate-500 dark:text-slate-400">Thème: {drawing.theme?.title ?? 'Inconnu'}</div>
                {isLate && (
                  <div className="mt-2 inline-block bg-red-700 text-white px-4 py-2 rounded font-extrabold animate-shake">
                    <span className="mr-2">😡</span>
                    <span>POSTÉ EN RETARD — VOUS N'AVEZ PAS RESPECTÉ LES RÈGLES. CE N'EST PAS ACCEPTABLE.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-300"><span className="font-medium">Artiste:</span> {drawing.user?.name || drawing.user?.email}</p>
              {drawing.description && (
                <p className="text-slate-700 dark:text-slate-200"><span className="font-medium">Description:</span> {drawing.description}</p>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">Soumis le {new Date(drawing.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div className="flex gap-2">
              <button onClick={downloadImage} className="btn btn-sm">Télécharger</button>
            </div>
          </div>
        </aside>

        <main className="md:col-span-9">
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden mb-3">
            <img src={drawing.image_url} alt={drawing.title} className="w-full h-auto object-contain max-h-[80vh] block mx-auto" />
          </div>

          <div className="mb-4">
            <Reactions drawingId={drawing.id} />
          </div>

          <div>
            <Comments drawingId={drawing.id} />
          </div>
        </main>
      </div>
    </div>
  )
}
