"use client";

import { useEffect, useState } from "react";
import { supabase, Comment } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  drawingId: string;
};

export default function Comments({ drawingId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("comments")
          .select(`*, user:users(id, name, email)`)
          .eq("drawing_id", drawingId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Erreur chargement commentaires:", error);
          setComments([]);
        } else {
          if (mounted) setComments((data as Comment[]) || []);
        }
      } catch (e) {
        console.error(e);
        setComments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchComments();

    // subscribe to realtime changes for this drawing's comments
    const channel = supabase.channel(`comments:drawing=${drawingId}`);

    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `drawing_id=eq.${drawingId}` },
        (payload) => {
          const newRow = payload.new as Comment;
          setComments((prev) => [...prev, newRow]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "comments", filter: `drawing_id=eq.${drawingId}` },
        (payload) => {
          const updated = payload.new as Comment;
          setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments", filter: `drawing_id=eq.${drawingId}` },
        (payload) => {
          const deleted = payload.old as Comment;
          setComments((prev) => prev.filter((c) => c.id !== deleted.id));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      // unsubscribe channel
      supabase.removeChannel(channel);
    };
  }, [drawingId]);

  // local state for edit/delete
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = newComment.trim();
    if (!trimmed) return;

    setSubmitting(true);

    try {
      // insert comment
      const { error, data } = await supabase.from("comments").insert({
        drawing_id: drawingId,
        user_id: user.id,
        content: trimmed,
      }).select(`*, user:users(id, name, email)`).single();

      if (error) throw error;

      // optimistic: the realtime listener will also append; but to show immediate feedback, append now if not present
      const inserted = data as Comment;
      setComments((prev) => [...prev, inserted]);
      setNewComment("");
    } catch (err) {
      console.error("Erreur envoi commentaire:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Comment) => {
    setEditingId(c.id);
    setEditingText(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async (id: string) => {
    if (!user) return;
    const trimmed = editingText.trim();
    if (!trimmed) return;
    setEditLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .update({ content: trimmed, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(`*, user:users(id, name, email)`)
        .single();

      if (error) throw error;
      const updated = data as Comment;
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingId(null);
      setEditingText("");
    } catch (err) {
      console.error("Erreur mise à jour commentaire:", err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const ok = confirm("Supprimer ce commentaire ?");
    if (!ok) return;
    setDeleteLoadingId(id);
    try {
      const { error } = await supabase.from("comments").delete().eq("id", id).limit(1);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Erreur suppression commentaire:", err);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Commentaires</h4>

      <div className="space-y-3 max-h-48 overflow-auto pr-2">
        {loading ? (
          <div className="text-sm text-slate-500">Chargement des commentaires...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-slate-500">Pas encore de commentaires. Soyez le premier !</div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-sm text-slate-800 dark:text-slate-100 font-medium">
                    {c.user?.name || c.user?.email || 'Anonyme'}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {editingId === c.id ? (
                      <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} className="textarea w-full" rows={2} />
                    ) : (
                      c.content
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  {user && user.id === c.user_id && (
                    editingId === c.id ? (
                      <>
                        <button className="btn btn-sm btn-primary" disabled={editLoading} onClick={() => saveEdit(c.id)}>{editLoading ? 'Enregistrement...' : 'Sauvegarder'}</button>
                        <button className="btn btn-sm btn-ghost" onClick={cancelEdit} disabled={editLoading}>Annuler</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-sm" onClick={() => startEdit(c)}>Modifier</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(c.id)} disabled={deleteLoadingId===c.id}>{deleteLoadingId===c.id ? 'Suppression...' : 'Supprimer'}</button>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="textarea w-full"
            placeholder="Écrire un commentaire..."
            disabled={submitting}
          />
          <div className="flex justify-end mt-2">
            <button type="submit" className="btn btn-sm btn-primary" disabled={submitting || newComment.trim().length===0}>
              {submitting ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 text-sm text-slate-600">Connectez-vous pour poster un commentaire.</div>
      )}
    </div>
  );
}
