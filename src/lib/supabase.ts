import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types pour notre base de données
export interface Theme {
  id: string
  title: string
  description: string
  date: string
  is_active: boolean
  created_at: string
}

export interface Drawing {
  id: string
  user_id: string
  theme_id: string
  image_url: string
  title: string
  description?: string
  created_at: string
  user: {
    email: string
    name?: string
  }
}

export interface Comment {
  id: string
  drawing_id: string
  user_id?: string | null
  content: string
  created_at: string
  user?: {
    id: string
    email: string
    name?: string | null
  } | null
}

export interface User {
  id: string
  email: string
  name?: string
  is_admin: boolean
  created_at: string
} 