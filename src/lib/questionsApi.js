
import { supabase } from './supabase'

export async function getQuestions({
  subject,
  topic,
  limit = 50,
} = {}) {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('status', 'published')
    .order('question_number', { ascending: true })
    .limit(limit)

  if (subject) {
    query = query.eq('subject', subject)
  }

  if (topic) {
    query = query.eq('topic', topic)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch questions:', error)
    throw error
  }

  return data
}
