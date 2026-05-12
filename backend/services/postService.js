// src/services/postService.js
import supabase from '../lib/supabase.js'

export async function getPosts({ page = 1, limit = 10, userId = null } = {}) {
  let query = supabase
    .from('posts')
    .select('id, title, content, created_at, profiles(username, avatar_url)', { count: 'exact' })
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (userId) query = query.eq('user_id', userId)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    data,
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
  }
}

export async function createPost({ title, content, userId }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({ title: title.trim(), content: content?.trim() ?? null, user_id: userId })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updatePost({ id, userId, updates }) {
  const { data, error } = await supabase
    .from('posts').update(updates)
    .eq('id', id).eq('user_id', userId)
    .select().single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Post non trovato o accesso negato')
  return data
}

export async function deletePost({ id, userId }) {
  const { error } = await supabase.from('posts').delete()
    .eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}
