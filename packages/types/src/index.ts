export interface Theme {
  id: string
  title: string
  description?: string
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
}

export interface Comment {
  id: string
  drawing_id: string
  user_id?: string | null
  content: string
  created_at: string
}
