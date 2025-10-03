"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";

// dynamic import to reduce initial bundle size; picker will be loaded only when opened
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="p-4 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
    </div>
  ),
});
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
    // Prefer readable name/email when available
    if (r.user && (r.user.name || r.user.email)) {
      list.users.push(r.user.name ?? r.user.email ?? r.user.id);
    } else if (r.user_id) {
      list.users.push(r.user_id);
    }
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
    // compute current myReaction from latest state to avoid stale closure
    const currentMyReaction = reactions.find((r) => r.user_id === user.id);
    // if user already has the same reaction, treat as toggle => remove
    if (currentMyReaction && currentMyReaction.emoji === emoji) {
      await removeMyReaction();
      return;
    }
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
  const [clickedEmoji, setClickedEmoji] = useState<string | null>(null);

  return (
    <div className="mt-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {aggregated.map((a) => {
            const displayNames = a.users.slice(0, 5).join(", ");
            const more = a.count > a.users.length ? a.count - a.users.length : 0;
            const title = more > 0 ? `${displayNames}, +${more} autres` : displayNames;
            return (
              <button
                key={a.emoji}
                title={title}
                className={`px-2 py-1 rounded-md border flex items-center gap-2 transition-transform duration-150 ${myReaction && myReaction.emoji === a.emoji ? 'bg-violet-100 dark:bg-violet-800' : 'bg-white dark:bg-slate-800'} ${clickedEmoji === a.emoji ? 'scale-110' : ''}`}
                onClick={() => {
                  // trigger small animation
                  setClickedEmoji(a.emoji);
                  setTimeout(() => setClickedEmoji(null), 220);
                  void setMyReaction(a.emoji);
                }}
                disabled={submitting}
              >
                <span className="text-lg">{a.emoji}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{a.count}</span>
              </button>
            );
          })}

          <button className="px-2 py-1 rounded-md border bg-white dark:bg-slate-800 flex items-center gap-2" onClick={() => setOpenPicker((s) => !s)} aria-expanded={openPicker}>
            <span className="text-lg">➕</span>
            <span className="ml-2 text-sm">Réagir</span>
          </button>
        </div>

        {openPicker && (
          <div>
            <EmojiPicker onEmojiClick={(data: EmojiClickData) => { setMyReaction(data.emoji); setOpenPicker(false); }} searchPlaceholder="Rechercher" />
          </div>
        )}

        {loading && <div className="text-xs text-slate-500 mt-2">Chargement des réactions...</div>}
      </div>
    </div>
  );
}
