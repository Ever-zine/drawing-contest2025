"use client"

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'

type TopDrawing = {
  id: string
  title?: string
  image_url?: string
  reactions_count?: number
}

type ServerStats = {
  totalDrawings: number
  totalReactions: number
  topDrawings: TopDrawing[]
}

export default function SpotifyWrapped({ serverStats }: { serverStats: ServerStats }) {
  const { user, loading } = useAuth()
  const [userStats, setUserStats] = useState<{ drawings: number; votesReceived: number } | null>(null)

  // Story carousel state
  const pages = ['overview', 'top', 'you'] as const
  type Page = (typeof pages)[number]
  const [pageIndex, setPageIndex] = useState(0)
  const pageTimer = useRef<number | null>(null)

  useEffect(() => {
    if (loading) return

    const fetchUserStats = async () => {
      if (!user) {
        setUserStats(null)
        return
      }

      const { count: drawingsCount } = await supabase
        .from('drawings')
        .select('id', { count: 'exact', head: false })
        .eq('user_id', user.id)

      const { data: userDrawings } = await supabase.from('drawings').select('id').eq('user_id', user.id)
      const ids = (userDrawings ?? []).map((d: { id: string }) => d.id)
      let votes = 0
      if (ids.length > 0) {
        const { count: reactionsCount } = await supabase
          .from('reactions')
          .select('id', { count: 'exact', head: false })
          .in('drawing_id', ids)
        votes = reactionsCount ?? 0
      }

      setUserStats({ drawings: drawingsCount ?? 0, votesReceived: votes })
    }

    fetchUserStats()
  }, [user, loading])

  // Auto-advance pages every 4s
  useEffect(() => {
    pageTimer.current = window.setInterval(() => {
      setPageIndex((i) => (i + 1) % pages.length)
    }, 4000)
    return () => {
      if (pageTimer.current) window.clearInterval(pageTimer.current)
    }
  }, [pages.length])

  const prev = () => setPageIndex((i) => (i - 1 + pages.length) % pages.length)
  const next = () => setPageIndex((i) => (i + 1) % pages.length)

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 100 : -100, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -100 : 100, opacity: 0, scale: 0.98 }),
  }

  // swipe helpers (left as future enhancement)

  return (
    <section className="bg-gradient-to-r from-[#0b1220] via-[#061025] to-[#00121a] rounded-3xl p-6 shadow-2xl border border-[rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-6">
        <div className="w-20 flex-shrink-0">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-indigo-700 via-pink-600 to-rose-500 flex items-center justify-center text-white font-bold">W</div>
        </div>

        <div className="flex-1">
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} custom={pageIndex}>
              {pageIndex === 0 && (
                // @ts-expect-error - framer-motion v10 typing vs our React/Next setup
                <motion.div key="overview" className="p-4" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }}>
                  <h3 className="text-2xl font-extrabold">Récapitulatif</h3>
                  <p className="text-slate-300">Vos chiffres clés et tendances.</p>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                      <div className="text-sm text-slate-400">Dessins publiés</div>
                      <div className="text-2xl font-bold">{serverStats.totalDrawings}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                      <div className="text-sm text-slate-400">Réactions totales</div>
                      <div className="text-2xl font-bold">{serverStats.totalReactions}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                      <div className="text-sm text-slate-400">Vos dessins</div>
                      <div className="text-2xl font-bold">{userStats ? userStats.drawings : '—'}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {pageIndex === 1 && (
                // @ts-expect-error - framer-motion v10 typing vs our React/Next setup
                <motion.div key="top" className="p-4" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }}>
                  <h3 className="text-2xl font-extrabold">Top œuvres</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {serverStats.topDrawings.map((d: TopDrawing) => (
                      <div key={d.id} className="rounded-lg overflow-hidden bg-gradient-to-br from-[#071024] to-[#001219]">
                        <div className="aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${d.image_url ?? '/file.svg'})` }} />
                        <div className="p-3">
                          <div className="font-semibold">{d.title ?? 'Sans titre'}</div>
                          <div className="text-sm text-slate-400">{d.reactions_count ?? 0} votes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {pageIndex === 2 && (
                // @ts-expect-error - framer-motion v10 typing vs our React/Next setup
                <motion.div key="you" className="p-4" custom={1} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45 }}>
                  <h3 className="text-2xl font-extrabold">Vos stats</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                      <div className="text-sm text-slate-400">Dessins soumis</div>
                      <div className="text-2xl font-bold">{userStats ? userStats.drawings : '—'}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)]">
                      <div className="text-sm text-slate-400">Votes reçus</div>
                      <div className="text-2xl font-bold">{userStats ? userStats.votesReceived : '—'}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-2">
              <button onClick={prev} className="btn btn-ghost">◀</button>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2">
              <button onClick={next} className="btn btn-ghost">▶</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
