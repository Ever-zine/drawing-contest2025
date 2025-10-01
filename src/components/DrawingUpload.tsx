"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function DrawingUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasSubmittedForTheme, setHasSubmittedForTheme] = useState<boolean>(false);
  const [todayThemeId, setTodayThemeId] = useState<number | null>(null);
  const [todayThemeRefs, setTodayThemeRefs] = useState<string[] | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setMessage("");
    setSelectedFile(file);

    // create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    return () => {
      // cleanup object URL on unmount
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // check if user already submitted for today's active theme
  useEffect(() => {
    const checkSubmission = async () => {
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      // get today's active theme
      const { data: themeData, error: themeError } = await supabase
        .from("themes")
        .select("id, reference_images")
        .eq("date", today)
        .eq("is_active", true)
        .single();

      if (themeError || !themeData) {
        setTodayThemeId(null);
        setHasSubmittedForTheme(false);
        setTodayThemeRefs(null);
        return;
      }

      setTodayThemeId(themeData.id);
      setTodayThemeRefs(themeData.reference_images || null);

      // check if user already has a drawing for this theme
      const { data: drawingsData, error: drawingsError } = await supabase
        .from("drawings")
        .select("id")
        .eq("theme_id", themeData.id)
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (drawingsError) {
        // if not found, drawingsError will be present; treat as not submitted
        setHasSubmittedForTheme(false);
      } else {
        setHasSubmittedForTheme(Boolean(drawingsData));
      }
    };

    checkSubmission();
  }, [user]);

  const handleUpload = useCallback(async () => {
    if (!user) {
      setMessage("Erreur: utilisateur non connecté");
      return;
    }

    if (!selectedFile) {
      setMessage("Erreur: aucun fichier sélectionné");
      return;
    }

    // re-check to prevent race: ensure user hasn't already submitted for this theme
    if (todayThemeId) {
      const { data: existing, error: existingError } = await supabase
        .from("drawings")
        .select("id")
        .eq("theme_id", todayThemeId)
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!existingError && existing) {
        setHasSubmittedForTheme(true);
        setMessage("Vous avez déjà soumis un dessin pour le thème d'aujourd'hui.");
        return;
      }
    }

    setUploading(true);
    setMessage("");

    try {
      // Upload vers Cloudinary
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
      );

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Erreur lors de l'upload vers Cloudinary");
      }

      // Récupérer le thème du jour
      const today = new Date().toISOString().split("T")[0];
      const { data: themeData, error: themeError } = await supabase
        .from("themes")
        .select("id, reference_images")
        .eq("date", today)
        .eq("is_active", true)
        .single();

      if (themeError) {
        throw new Error("Aucun thème actif trouvé pour aujourd'hui");
      }

      // Sauvegarder dans Supabase
      const { error: insertError } = await supabase.from("drawings").insert({
        user_id: user.id,
        theme_id: themeData.id,
        image_url: data.secure_url,
        title: title || "Sans titre",
        description: description || null,
      });

      if (insertError) {
        throw insertError;
      }

      setMessage("🎉 Votre dessin a été uploadé avec succès !");
      setTitle("");
      setDescription("");
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(`Erreur: ${msg}`);
    } finally {
      setUploading(false);
    }
  }, [user, selectedFile, title, description, previewUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    disabled: uploading || hasSubmittedForTheme,
  });

  const isContestEnded = new Date().getHours() >= 24;

  if (isContestEnded) {
    return (
      <div className="card card-hover p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-extrabold mb-3 sm:mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Envoi de dessin
        </h2>
        <div className="alert alert-info">
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base">
            {
              "⏰ Le concours est terminé pour aujourd'hui. Vous ne pouvez plus uploader de dessins."
            }
          </p>
        </div>
      </div>
    );
  }

  // If user already submitted for today's theme, show only the message
  if (hasSubmittedForTheme) {
    return (
      <div className="card card-hover p-4 sm:p-6 mb-6">
        <h2 className="text-lg sm:text-xl font-extrabold mb-3 sm:mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Envoi de dessin
        </h2>
        <div className="alert alert-warning">
          <p className="text-sm">Vous avez déjà soumis un dessin pour le thème d'aujourd'hui. Vous ne pouvez plus en soumettre un autre.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover p-4 sm:p-6 mb-6">
      <h2 className="text-lg sm:text-xl font-extrabold mb-3 sm:mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
        Upload de dessin
      </h2>

      {todayThemeRefs && todayThemeRefs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Images de référence</h3>
          <div className="flex gap-3 flex-wrap">
            {todayThemeRefs.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img} src={img} alt="reference" className="h-24 w-24 object-cover rounded" />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Titre du dessin
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Donnez un titre à votre dessin..."
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Description (optionnel)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="textarea"
            placeholder="Décrivez votre dessin..."
          />
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center text-sm sm:text-base cursor-pointer transition-colors ${
            isDragActive
              ? "border-violet-400 bg-violet-50 dark:bg-white/5"
              : "border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-white/5"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
            {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-7 w-7 sm:h-8 sm:w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
              <p className="text-slate-600 dark:text-slate-300">
                Envoi en cours...
              </p>
            </div>
          ) : (
            <div>
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎨</div>
                {isDragActive ? (
                <p className="text-violet-600 dark:text-violet-300 font-medium">
                  Déposez votre image ici...
                </p>
              ) : (
                <div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base mb-2">
                      Glissez-déposez votre image ici, ou cliquez pour
                      sélectionner
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Formats acceptés: JPEG, PNG, GIF, WebP
                    </p>
                    {selectedFile && (
                      <div className="mt-3 flex items-center justify-center space-x-3">
                        {previewUrl ? (
                          // image preview
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={previewUrl} alt="preview" className="h-20 w-20 object-cover rounded" />
                        ) : (
                          <div className="text-sm text-slate-600">{selectedFile.name}</div>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
        </div>

          {selectedFile && (
            <div className="flex items-center justify-center space-x-3 mt-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className={`btn btn-primary ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? 'Envoi en cours...' : 'Envoyer'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  setMessage('');
                }}
                disabled={uploading}
                className="btn btn-ghost"
              >
                Supprimer
              </button>
            </div>
          )}

        {message && (
          <div
            className={`mt-2 sm:mt-3 ${message.includes("Erreur") ? "alert alert-error" : "alert alert-success"}`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
