// src/routes/posts.js
import express         from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getPosts, createPost, updatePost, deletePost } from '../services/postService.js'
import { createPostRules, paginationRules, validate }   from '../validators/postValidators.js'

const router = express.Router()

/** GET /posts — lista post pubblicati con paginazione */
router.get('/', paginationRules, validate, async (req, res) => {
  try {
    const result = await getPosts({
      page:   Number(req.query.page ?? 1),
      limit:  Number(req.query.limit ?? 10),
      userId: req.query.userId ?? null,
    })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /posts — crea post (richiede auth) */
router.post('/', requireAuth, createPostRules, validate, async (req, res) => {
  try {
    const post = await createPost({
      title:   req.body.title,
      content: req.body.content,
      userId:  req.user.id,
    })
    res.status(201).json(post)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** PUT /posts/:id — aggiorna post (solo proprietario) */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const post = await updatePost({
      id:      req.params.id,
      userId:  req.user.id,
      updates: req.body,
    })
    res.json(post)
  } catch (err) {
    res.status(err.message.includes('non trovato') ? 404 : 500).json({ error: err.message })
  }
})

/** DELETE /posts/:id — elimina post (solo proprietario) */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await deletePost({ id: req.params.id, userId: req.user.id })
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
