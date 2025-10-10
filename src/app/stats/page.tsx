import SpotifyWrapped from '@/components/SpotifyWrapped'
import { supabase } from '@/lib/supabase'

export const metadata = {
  title: 'Stats — Wrapped',
}

async function getPublicStats() {
  // Total drawings
  const { count: totalDrawings } = await supabase
    .from('drawings')
    .select('id', { count: 'exact', head: false })

  // Total reactions
  const { count: totalReactions } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: false })

  // Fetch drawings with nested reactions (PostgREST "foreign table" select)
  const { data: drawings } = await supabase
    .from('drawings')
    .select('id, title, image_url, user, created_at, reactions(id)')

  type SupaDrawing = {
    id: string
    title?: string
    image_url?: string
    user?: unknown
    created_at?: string
    reactions?: { id: string }[]
  }

  const topDrawings = (drawings ?? [])
    .map((d: SupaDrawing) => ({
      id: d.id,
      title: d.title,
      image_url: d.image_url,
      user: d.user,
      created_at: d.created_at,
      reactions_count: Array.isArray(d.reactions) ? d.reactions.length : 0,
    }))
    .sort((a, b) => b.reactions_count - a.reactions_count)
    .slice(0, 3)

  return {
    totalDrawings: totalDrawings ?? 0,
    totalReactions: totalReactions ?? 0,
    topDrawings,
  }
}

export default async function StatsPage() {
  const stats = await getPublicStats()

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#071024] to-[#001219] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-6">Vos stats — Wrapped</h1>
        <p className="mb-8 text-slate-300">Un aperçu ludique de vos statistiques du concours.</p>

        <SpotifyWrapped serverStats={stats} />
      </div>
    </main>
  )
}
