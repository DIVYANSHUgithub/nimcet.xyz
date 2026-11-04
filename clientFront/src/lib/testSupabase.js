
import { getQuestions } from './questionsApi'

export async function testSupabaseConnection() {
  try {
    const questions = await getQuestions()

    console.log('Questions fetched from Supabase:', questions)

    return { success: true, data: questions }
  } catch (error) {
    console.error('Supabase query failed:', error)

    return { success: false, error }
  }
}
