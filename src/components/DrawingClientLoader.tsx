"use client"

import React, { useEffect, useState } from 'react'
import { supabase, type Drawing } from '@/lib/supabase'
import DrawingPage from '@/components/DrawingPage'

type Props = {
  id: string
}

export default function DrawingClientLoader({ id }: Props) {
  const [drawing, setDrawing] = useState<Drawing & { theme?: { title?: string | null; date?: string | null } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const fetchDrawing = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('drawings')
          .select(`*, user:users(email, name), theme:themes(title, date)`)
          .eq('id', id)
          .single()

        if (error || !data) {
          if (mounted) setError('Dessin introuvable')
        } else {
          if (mounted) setDrawing(data as any)
        }
      } catch (e) {
        if (mounted) setError('Erreur réseau')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchDrawing()

    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="container-padded py-8">
        <div className="card p-4">Chargement du dessin...</div>
      </div>
    )
  }

  if (error || !drawing) {
    return (
      <div className="container-padded py-8">
        <div className="card p-4">{error ?? 'Dessin introuvable'}</div>
      </div>
    )
  }

  return (
    <div className="container-padded py-8">
      <DrawingPage drawing={drawing} />
    </div>
  )
}
