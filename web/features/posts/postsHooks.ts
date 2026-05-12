// src/features/posts/postsHooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../types/database'

type Post    = Database['public']['Tables']['posts']['Row']
type NewPost = Database['public']['Tables']['posts']['Insert']

async function fetchPosts({ page = 1, limit = 10 } = {}) {
  const { data, error, count } = await supabase
    .from('posts')
    .select('id, title, content, created_at, profiles(username, avatar_url)', { count: 'exact' })
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)
  if (error) throw new Error(error.message)
  return { data: data as Post[], total: count ?? 0 }
}

export function usePosts(page = 1) {
  return useQuery({
    queryKey: ['posts', page],
    queryFn:  () => fetchPosts({ page }),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (post: Pick<NewPost, 'title' | 'content'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non autenticato')
      const { data, error } = await supabase.from('posts')
        .insert({ ...post, user_id: user.id }).select().single()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  })
}

export function useRealtimePosts() {
  const qc = useQueryClient()
  return {
    subscribe: () => {
      const ch = supabase.channel('posts-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          qc.invalidateQueries({ queryKey: ['posts'] })
        })
        .subscribe()
      return () => supabase.removeChannel(ch)
    },
  }
}
