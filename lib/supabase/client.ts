'use client'

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {

  console.log('SUPABASE CLIENT DEBUG');
  console.log('1. URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('2. PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  console.log('3. ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('4. Все NEXT_PUBLIC переменные:');
  

  Object.keys(process.env).forEach(key => {
    if (key.startsWith('NEXT_PUBLIC_')) {
      console.log(`   ${key}:`, process.env[key]);
    }
  });

  // Проверка на undefined
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is undefined!');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is undefined!');
  }

  try {
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    console.log('Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw error;
  }
}