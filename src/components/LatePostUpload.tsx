"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type ThemeOption = { id: string; title: string; date: string };

export default function LatePostUpload() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // fetch past themes that are not active (or all themes) and that the user hasn't submitted for
    const fetchThemes = async () => {
      if (!user) return;
      setLoadingThemes(true);

      try {
        // get recent themes (limit 30) ordered desc by date — only inactive (past) themes and not future dates
        const today = new Date().toLocaleDateString("fr-CA");
        const { data: themesData, error: themesError } = await supabase
          .from("themes")
          .select("id,title,date,is_active")
          .eq("is_active", true)
          .lte("date", today)
          .order("date", { ascending: false })
          .limit(30);

        if (themesError || !themesData) {
          setThemes([]);
          return;
        }

        // fetch all drawings by the user for those theme ids in one query (optimization)
        const themeIds = (themesData as ThemeOption[]).map((t) => t.id);
        const { data: userDrawings } = await supabase
          .from("drawings")
          .select("theme_id")
          .in("theme_id", themeIds)
          .eq("user_id", user.id);

        const userDrawingsArr = (userDrawings || []) as Array<{ theme_id?: string | null }>;
        const submittedThemeIds = new Set<string>(userDrawingsArr.map((d) => String(d.theme_id)));

        const filtered = (themesData as ThemeOption[]).filter((t) => !submittedThemeIds.has(String(t.id)));

        setThemes(filtered);

        // preserve current selection if still present, otherwise clear it (use functional update to avoid stale closure)
        setSelectedThemeId((prev) => {
          if (prev === null) return prev;
          return filtered.some((t) => String(t.id) === prev) ? prev : null;
        });
      } catch (err) {
        console.error("Erreur fetching themes:", err);
        setThemes([]);
      } finally {
        setLoadingThemes(false);
      }
    };

    console.debug("LatePostUpload: starting fetchThemes");
    fetchThemes();
  }, [user]);

  useEffect(() => {
    console.debug("LatePostUpload: selectedThemeId changed ->", selectedThemeId);
  }, [selectedThemeId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setMessage(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleUpload = useCallback(async () => {
    if (!user) {
      setMessage("Erreur: utilisateur non connecté");
      return;
    }

    if (!selectedFile) {
      setMessage("Erreur: aucun fichier sélectionné");
      return;
    }

    if (!selectedThemeId) {
      setMessage("Erreur: choisissez un thème");
      return;
    }

    // double-check user hasn't submitted for this theme
    const { data: existing, error: existingError } = await supabase
      .from("drawings")
      .select("id")
      .eq("theme_id", selectedThemeId)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!existingError && existing) {
      setMessage("Vous avez déjà soumis un dessin pour ce thème.");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const data = await response.json();
      if (!response.ok) throw new Error("Erreur lors de l'upload vers Cloudinary");

      const { error: insertError } = await supabase.from("drawings").insert({
        user_id: user.id,
        theme_id: selectedThemeId,
        image_url: data.secure_url,
        title: title || "Sans titre (en retard)",
        description: description || null,
      });

      if (insertError) throw insertError;

      setMessage("Votre dessin en retard a bien été publié. (C&apos;est mal, mais c&apos;est fait)");
      setSelectedFile(null);
      setPreviewUrl(null);
      setTitle("");
      setDescription("");

      // remove the theme from the selectable list
      setThemes((prev) => prev.filter((t) => t.id !== selectedThemeId));
      setSelectedThemeId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(`Erreur: ${msg}`);
    } finally {
      setUploading(false);
    }
  }, [user, selectedFile, selectedThemeId, title, description]);

  return (
    <div className="card card-hover p-4 sm:p-6 mb-6 border-2 border-red-600 bg-red-50 dark:bg-red-900/20">
      <h2 className="text-lg sm:text-xl font-extrabold mb-3 sm:mb-4 text-red-700">POSTER EN RETARD</h2>
      <p className="text-sm text-red-600 mb-3">
        Ce n&apos;est pas bien de poster après la deadline. Si tu insistes, choisis un thème ci-dessous.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-red-700 mb-1">Choisir un thème</label>
          <select
            value={selectedThemeId === null ? "" : String(selectedThemeId)}
            onChange={(e) => {
              const v = e.target.value;
              console.debug("LatePostUpload: select onChange raw value=", v);
              const final = v || null;
              console.debug("LatePostUpload: parsed selection=", final);
              setSelectedThemeId(final);
            }}
            className="input"
            disabled={loadingThemes}
          >
            {loadingThemes ? (
              <option value="">Chargement...</option>
            ) : (
              <>
                <option value="">-- Choisir un thème --</option>
                {themes.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.date} — {t.title}
                  </option>
                ))}
              </>
            )}
          </select>
          <p className="text-xs text-red-600 mt-1">Seuls les thèmes pour lesquels vous n&apos;avez pas déjà soumis un dessin sont affichés.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-red-700 mb-1">Titre</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du dessin (optionnel)" />
        </div>

        <div>
          <label className="block text-sm font-medium text-red-700 mb-1">Description (optionnel)</label>
          <textarea className="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer ${isDragActive ? 'border-red-400 bg-red-50' : 'border-red-300 hover:border-red-400 hover:bg-red-50'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="text-3xl mb-2">😡</div>
          {selectedFile ? (
            <div>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="h-28 w-28 object-cover rounded mx-auto mb-2" />
              ) : (
                <div className="text-sm text-red-700">{selectedFile.name}</div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-red-700">Glissez-déposez l&apos;image ici, ou cliquez pour sélectionner.</p>
              <p className="text-xs text-red-600">Formats: JPEG, PNG, GIF, WebP</p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex items-center gap-3">
            <button onClick={handleUpload} disabled={uploading} className={`btn btn-danger ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {uploading ? 'Envoi...' : "Poster en retard"}
            </button>
            <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); setMessage(null); }} className="btn btn-ghost">Annuler</button>
          </div>
        )}

        {message && (
          <div className={`mt-2 ${message.startsWith('Erreur') ? 'alert alert-error' : 'alert alert-info'}`}>{message}</div>
        )}
      </div>
    </div>
  );
}
