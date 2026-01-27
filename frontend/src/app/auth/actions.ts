'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // 1. Get data from form
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 2. Sign in
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=Invalid login credentials')
  }

  // 3. Revalidate and redirect
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // 1. Get data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const { generateUserApiKey } = await import('@/lib/auth-utils')
  const apiKey = await generateUserApiKey()

  // 2. Sign up
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        api_key: apiKey
      }
    }
  })

  if (error) {
    redirect(`/signup?error=${error.message}`)
  }


  // 3. Success
  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to confirm your account')
}

export async function getOrCreateApiKey() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Check if key already exists
  const existingKey = user.user_metadata?.api_key
  if (existingKey && existingKey !== "GENERATE_BY_SIGNING_UP") {
    return existingKey
  }

  // Generate new key
  try {
    const { generateUserApiKey } = await import('@/lib/auth-utils')
    const { createAdminClient } = await import('@/utils/supabase/admin')

    const newApiKey = await generateUserApiKey()
    const adminSupabase = createAdminClient()

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, api_key: newApiKey } }
    )

    if (updateError) throw updateError

    return newApiKey
  } catch (e) {
    console.error("Error generating API key:", e)
    return null
  }
}
