"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function DrawingUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) return;

      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);
      setMessage("");

      try {
        // Upload vers Cloudinary
        const formData = new FormData();
        formData.append("file", file);
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
          .select("id")
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
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Une erreur est survenue";
        setMessage(`Erreur: ${msg}`);
      } finally {
        setUploading(false);
      }
    },
    [user, title, description],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const isContestEnded = new Date().getHours() >= 24;

  if (isContestEnded) {
    return (
      <div className="card card-hover p-6 mb-6">
        <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Upload de dessin
        </h2>
        <div className="alert alert-info">
          <p className="text-gray-600">
            {
              "⏰ Le concours est terminé pour aujourd'hui. Vous ne pouvez plus uploader de dessins."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover p-6 mb-6">
      <h2 className="text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
        Upload de dessin
      </h2>

      <div className="space-y-4">
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
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-violet-400 bg-violet-50 dark:bg-white/5"
              : "border-slate-300 dark:border-slate-700 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-white/5"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto mb-2"></div>
              <p className="text-slate-600 dark:text-slate-300">
                Upload en cours...
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">🎨</div>
              {isDragActive ? (
                <p className="text-violet-600 dark:text-violet-300 font-medium">
                  Déposez votre image ici...
                </p>
              ) : (
                <div>
                  <p className="text-slate-600 dark:text-slate-300 mb-2">
                    Glissez-déposez votre image ici, ou cliquez pour
                    sélectionner
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Formats acceptés: JPEG, PNG, GIF, WebP
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {message && (
          <div
            className={`mt-2 ${message.includes("Erreur") ? "alert alert-error" : "alert alert-success"}`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
