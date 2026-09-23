
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  console.log("SUPABASE URL:", url);
  console.log("SUPABASE KEY EXISTS:", !!key);

  return createBrowserClient(url!, key!);
}