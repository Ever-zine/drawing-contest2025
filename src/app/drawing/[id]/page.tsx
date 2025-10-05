import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Drawing } from '@/lib/supabase'
import DrawingPage from '@/components/DrawingPage'
import DrawingClientLoader from '@/components/DrawingClientLoader'


export default async function Page({ params }: { params?: Promise<{ id: string }> }) {
  const paramsObj = params ? await params : undefined
  if (!paramsObj?.id) return notFound()
  const { id } = paramsObj

  // Try server-side fetch to render statically/SSR when available
  const { data, error } = await supabase
    .from('drawings')
    .select(`*, user:users(email, name), theme:themes(title, date)`)
    .eq('id', id)
    .single()

  if (error || !data) {
    // If the drawing wasn't available at build time (or server fetch failed),
    // render a client-side loader that will fetch the drawing directly.
    // This allows static hosting (GitHub Pages) to still display newly added drawings
    // without requiring a full rebuild.
    return <DrawingClientLoader id={id} />
  }

  const drawing = data as Drawing & { theme?: { title?: string | null; date?: string | null } }

  return (
    <div className="container-padded py-8">
      <DrawingPage drawing={drawing} />
    </div>
  )
}

export async function generateStaticParams() {
  const { data, error } = await supabase.from('drawings').select('id')
  if (error || !data) return []

  return data.map((d: { id: string }) => ({ id: d.id }))
}
