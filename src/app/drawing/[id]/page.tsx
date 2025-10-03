import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Drawing } from '@/lib/supabase'
import DrawingPage from '@/components/DrawingPage'


export default async function Page({ params }: { params?: Promise<{ id: string }> }) {
  const paramsObj = params ? await params : undefined
  if (!paramsObj?.id) return notFound()
  const { id } = paramsObj

  const { data, error } = await supabase
    .from('drawings')
    .select(`*, user:users(email, name), theme:themes(title, date)`)
    .eq('id', id)
    .single()

  if (error || !data) {
    return notFound()
  }

  const drawing = data as Drawing & { theme?: { title?: string | null; date?: string | null } }

  return (
    <div className="container-padded py-8">
      <DrawingPage drawing={drawing} />
    </div>
  )
}
