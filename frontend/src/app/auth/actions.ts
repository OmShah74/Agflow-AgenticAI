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

  // 2. Sign up
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            full_name: fullName
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