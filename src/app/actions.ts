"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  message?: string;
  /** What the user typed, so a failed submit doesn't wipe the field (React resets forms after actions). */
  value?: string;
}

export async function authenticate(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) return { error: "Enter your email and a password of at least 8 characters.", value: email };
  const supabase = await createClient();
  if (formData.get("intent") === "signup") {
    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
    if (error) return { error: error.message, value: email };
    if (!data.session) return { message: "Check your email and click the link to confirm your account.", value: email };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, value: email };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
