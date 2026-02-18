import { createBrowserClient } from "@supabase/ssr";

// Этот файл будет автоматически помечен как клиентский
export function createClientComponent() {
  // Здесь process.env работает, потому что Next.js подставляет значения на этапе сборки
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}