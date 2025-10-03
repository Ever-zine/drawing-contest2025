"use client";

import { useEffect, useState } from "react";
import { supabase, Reaction } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  drawingId: string;
};

// small helper to aggregate reactions by emoji
function aggregate(reactions: Reaction[]) {
  const map = new Map<string, { emoji: string; count: number; users: string[] }>();
  for (const r of reactions) {
    const e = r.emoji;
    const list = map.get(e) ?? { emoji: e, count: 0, users: [] };
    list.count++;
    if (r.user_id) list.users.push(r.user_id);
    map.set(e, list);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export default function Reactions({ drawingId }: Props) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reactions")
          .select(`*, user:users(id, name, email)`)
          .eq("drawing_id", drawingId)
          .order("created_at", { ascending: true });
        if (error) {
          console.error("Erreur fetch reactions:", error);
          setReactions([]);
        } else {
          if (mounted) setReactions((data as Reaction[]) || []);
        }
      } catch (err) {
        console.error(err);
        setReactions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();

    const channel = supabase.channel(`reactions:drawing=${drawingId}`);
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reactions", filter: `drawing_id=eq.${drawingId}` }, (payload) => {
        setReactions((prev) => [...prev, payload.new as Reaction]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reactions", filter: `drawing_id=eq.${drawingId}` }, (payload) => {
        const updated = payload.new as Reaction;
        setReactions((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reactions", filter: `drawing_id=eq.${drawingId}` }, (payload) => {
        const oldRow = payload.old as Reaction;
        setReactions((prev) => prev.filter((r) => r.id !== oldRow.id));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [drawingId]);

  const myReaction = reactions.find((r) => user && r.user_id === user.id);
  const aggregated = aggregate(reactions);

  const setMyReaction = async (emoji: string) => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Upsert: si l'utilisateur a déjà une réaction, on met à jour; sinon on insert
      // On suppose une contrainte unique (drawing_id, user_id) côté DB pour faciliter l'upsert
      const { error, data } = await supabase
        .from("reactions")
        .upsert({ drawing_id: drawingId, user_id: user.id, emoji }, { onConflict: "drawing_id,user_id" })
        .select(`*, user:users(id, name, email)`)
        .single();

      if (error) throw error;

      // optimistic local update: the realtime listener will also handle
      const updated = data as Reaction;
      setReactions((prev) => {
        const existingIndex = prev.findIndex((r) => r.id === updated.id || (r.user_id === user.id && r.drawing_id === drawingId));
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = updated;
          return next;
        }
        return [...prev, updated];
      });
    } catch (err) {
      console.error("Erreur set reaction:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const removeMyReaction = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reactions").delete().match({ drawing_id: drawingId, user_id: user.id });
      if (error) throw error;
      setReactions((prev) => prev.filter((r) => r.user_id !== user.id || r.drawing_id !== drawingId));
    } catch (err) {
      console.error("Erreur remove reaction:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // nicer picker: popover toggle with grid and custom input
  const palette = ["❤️", "👍", "😂", "🔥", "👏", "😮", "🎉", "🤩", "😢", "🤝", "🌟", "💯"];
  const [openPicker, setOpenPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {aggregated.map((a) => (
            <button key={a.emoji} className={`px-2 py-1 rounded-md border flex items-center gap-2 ${myReaction && myReaction.emoji === a.emoji ? 'bg-violet-100 dark:bg-violet-800' : 'bg-white dark:bg-slate-800'}`} onClick={() => setMyReaction(a.emoji)} disabled={submitting}>
              <span className="text-lg">{a.emoji}</span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{a.count}</span>
            </button>
          ))}

          <button className="px-2 py-1 rounded-md border bg-white dark:bg-slate-800" onClick={() => setOpenPicker((s) => !s)} aria-expanded={openPicker}>
            {myReaction ? <span className="text-lg">{myReaction.emoji}</span> : <span className="text-lg">➕</span>} <span className="ml-2 text-sm">Réagir</span>
          </button>

          {user && myReaction && (
            <button className="btn btn-ghost btn-sm ml-2" onClick={removeMyReaction} disabled={submitting}>
              Supprimer ma réaction
            </button>
          )}
        </div>

        {openPicker && (
          <div className="mt-2 p-3 border rounded-lg bg-white dark:bg-slate-900 shadow-sm w-full max-w-md">
            <div className="grid grid-cols-6 gap-2">
              {palette.map((e) => (
                <button key={e} className={`p-2 text-2xl rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ${myReaction && myReaction.emoji === e ? 'ring-2 ring-violet-400' : ''}`} onClick={() => { setMyReaction(e); setOpenPicker(false); }}>
                  {e}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input value={customEmoji} onChange={(e) => setCustomEmoji(e.target.value)} placeholder="Emoji personnalisé (colle ici)" className="input flex-1" />
              <button className="btn btn-primary" onClick={() => { if (customEmoji.trim()) { setMyReaction(customEmoji.trim()); setCustomEmoji(""); setOpenPicker(false); } }} disabled={submitting}>Ajouter</button>
            </div>
          </div>
        )}

        {loading && <div className="text-xs text-slate-500 mt-2">Chargement des réactions...</div>}
      </div>
    </div>
  );
}
