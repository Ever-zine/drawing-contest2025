import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Drawing } from '@/lib/supabase'
import DrawingPage from '@/components/DrawingPage'

type Props = { params: { id: string } }

export default async function Page({ params }: Props) {
  const { id } = params

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
