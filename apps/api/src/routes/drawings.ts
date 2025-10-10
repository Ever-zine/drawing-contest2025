import { Router } from 'express'

const router = Router()

// GET /drawings
router.get('/', async (req, res) => {
  // Stubbed response — later will call Prisma
  res.json({ items: [], meta: { page: 1, limit: 20, total: 0 } })
})

// POST /drawings
router.post('/', async (req, res) => {
  const { title, imageUrl, themeId } = req.body
  if (!title || !imageUrl || !themeId) {
    return res.status(400).json({ error: 'title, imageUrl and themeId required' })
  }

  // TODO: create with Prisma
  const created = { id: 'stub-id', title, imageUrl, themeId }
  res.status(201).json(created)
})

export default router
