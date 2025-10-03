"use client";

import { useEffect, useState } from "react";
import { supabase, Reaction } from "@/lib/supabase";

type Props = {
  drawingId: string;
  max?: number;
};

export default function ReactionPreview({ drawingId, max = 3 }: Props) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("reactions")
          .select("emoji, created_at")
          .eq("drawing_id", drawingId)
          .order("created_at", { ascending: true });
        if (error) {
          // eslint-disable-next-line no-console
          console.error("Erreur fetch reaction preview:", error);
          setReactions([]);
        } else if (mounted) {
          setReactions((data as Reaction[]) || []);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setReactions([]);
      }
    };

    fetch();

    const channel = supabase.channel(`reactions_preview:drawing=${drawingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions", filter: `drawing_id=eq.${drawingId}` }, (payload) => {
        // simple approach: refetch or apply local change
        // For simplicity, refetch entire preview
        void (async () => {
          const { data } = await supabase
            .from("reactions")
            .select("emoji, created_at")
            .eq("drawing_id", drawingId)
            .order("created_at", { ascending: true });
          setReactions((data as Reaction[]) || []);
        })();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [drawingId]);

  // aggregate
  const map = new Map<string, number>();
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
  }
  const items = Array.from(map.entries())
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);

  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      {items.map((it) => (
        <div key={it.emoji} className="flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 border">
          <span className="text-lg">{it.emoji}</span>
          <span className="text-xs text-slate-600 dark:text-slate-300">{it.count}</span>
        </div>
      ))}
    </div>
  );
}
