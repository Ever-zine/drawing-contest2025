import React from "react";
import { notFound } from "next/navigation";
import { supabase, type Drawing } from "@/lib/supabase";
import DrawingCard from "@/components/DrawingCard";
import ProfileHeader from "@/components/ProfileHeader";

// Page component receives params from Next.js app router
async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

async function fetchDrawingsForUser(userId: string) {
  const { data, error } = await supabase
    .from("drawings")
    .select(`*, user:users(email, name), theme:themes(title, date)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

/**
 * Profile page
 * @param {{ params: { id: string } }} props
 */
export default async function ProfilePage(props: unknown) {
  const { params } = props as { params: { id: string } };
  const { id } = params;

  const profile = await fetchProfile(id);
  if (!profile) return notFound();

  const { data: drawings } = await fetchDrawingsForUser(id) as { data: Drawing[] };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <ProfileHeader user={profile} drawingsCount={Array.isArray(drawings) ? drawings.length : 0} />

      <section className="mt-6">
  <h2 className="text-lg font-extrabold mb-4">Dessins de {profile.name || profile.email}</h2>

        {(!drawings || drawings.length === 0) ? (
          <div className="card p-6 text-center">
            <div className="text-4xl mb-4">🎨</div>
            <p className="text-slate-600">Aucun dessin pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {drawings.map((d: Drawing) => (
              <DrawingCard key={d.id} drawing={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
