"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Theme } from "@/lib/supabase";

export default function AdminPage() {
  const { user } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTheme, setNewTheme] = useState({
    title: "",
    description: "",
    date: "",
    is_active: false,
    // hold selected reference image files before upload
    referenceFiles: [] as File[],
  });
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      setCheckingAdmin(true);
      const { data, error } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(
          "Erreur lors de la vérification des droits admin:",
          error,
        );
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data?.is_admin);
      }
      setCheckingAdmin(false);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchThemes();
    }
  }, [isAdmin]);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("themes")
        // include reference_images column
        .select("*")
        .order("date", { ascending: true });

      if (error) {
        console.error("Erreur lors du chargement des thèmes:", error);
      } else {
        setThemes(data || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      // Upload reference files to Cloudinary first (if any)
      let uploadedUrls: string[] = [];
      const files: File[] = (newTheme as any).referenceFiles || [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: fd },
        );

        const json = await res.json();
        if (!res.ok) throw new Error("Erreur upload image de référence");
        uploadedUrls.push(json.secure_url);
      }

      const payload: any = {
        title: newTheme.title,
        description: newTheme.description,
        date: newTheme.date,
        is_active: newTheme.is_active,
      };
      if (uploadedUrls.length) payload.reference_images = uploadedUrls;

      const { error } = await supabase.from("themes").insert([payload]);

      if (error) {
        throw error;
      }

      setMessage("✅ Thème ajouté avec succès !");
      setNewTheme({ title: "", description: "", date: "", is_active: false, referenceFiles: [] });
      fetchThemes();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(`Erreur: ${msg}`);
    }
  };

  const handleReferenceFilesChange = (files: FileList | null) => {
    if (!files) return;
    setNewTheme({ ...newTheme, referenceFiles: Array.from(files) });
  };

  const removeReferenceImage = async (themeId: string, imageUrl: string) => {
    if (!confirm("Supprimer cette image de référence ?")) return;

    try {
      // fetch existing images
      const { data: existing, error: fetchError } = await supabase
        .from("themes")
        .select("reference_images")
        .eq("id", themeId)
        .single();

      if (fetchError) throw fetchError;

      const updated: string[] = (existing.reference_images || []).filter((u: string) => u !== imageUrl);

      const { error: updateError } = await supabase
        .from("themes")
        .update({ reference_images: updated })
        .eq("id", themeId);

      if (updateError) throw updateError;

      setMessage("Image de référence supprimée");
      fetchThemes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(`Erreur: ${msg}`);
    }
  };

  const toggleThemeStatus = async (themeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("themes")
        .update({ is_active: !currentStatus })
        .eq("id", themeId);

      if (error) {
        throw error;
      }

      fetchThemes();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(`Erreur: ${msg}`);
    }
  };

  const deleteTheme = async (themeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce thème ?")) return;

    try {
      const { error } = await supabase
        .from("themes")
        .delete()
        .eq("id", themeId);

      if (error) {
        throw error;
      }

      fetchThemes();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(`Erreur: ${msg}`);
    }
  };

  if (user && checkingAdmin) {
    return (
      <div className="container-padded py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Vérification des droits...
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Merci de patienter pendant la vérification de vos droits d’accès.
          </p>
        </div>
      </div>
    );
  }

  if (!user || (!checkingAdmin && !isAdmin)) {
    return (
      <div className="container-padded py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Accès refusé
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Vous devez être connecté et avoir les droits administrateur pour
            accéder à cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-padded py-6 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
          Administration - Gestion des thèmes
        </h1>

        {/* Formulaire d'ajout */}
        <div className="card card-hover p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-extrabold mb-3 sm:mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Ajouter un nouveau thème
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Titre du thème
                </label>
                <input
                  id="title"
                  type="text"
                  value={newTheme.title}
                  onChange={(e) =>
                    setNewTheme({ ...newTheme, title: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={newTheme.date}
                  onChange={(e) =>
                    setNewTheme({ ...newTheme, date: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                value={newTheme.description}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, description: e.target.value })
                }
                rows={3}
                className="textarea"
                required
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="is_active"
                type="checkbox"
                checked={newTheme.is_active}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, is_active: e.target.checked })
                }
                className="h-5 w-5 text-violet-600 focus:ring-violet-500 border-slate-300 rounded"
              />
              <label
                htmlFor="is_active"
                className="ml-1 sm:ml-2 block text-sm text-slate-700 dark:text-slate-300"
              >
                Actif (visible pour les utilisateurs)
              </label>
            </div>

            <div>
              <label
                htmlFor="reference_images"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Images de référence (optionnel)
              </label>
              <input
                id="reference_images"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleReferenceFilesChange(e.target.files)}
                className="block w-full"
              />
              {(newTheme as any).referenceFiles && (newTheme as any).referenceFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(newTheme as any).referenceFiles.map((f: File, idx: number) => (
                    <div key={idx} className="text-sm px-2 py-1 bg-slate-100 rounded">{f.name}</div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary w-full h-10">
              Ajouter le thème
            </button>
          </form>

          {message && (
            <div
              className={`mt-3 sm:mt-4 ${message.includes("Erreur") ? "alert alert-error" : "alert alert-success"}`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Liste des thèmes */}
        <div className="card card-hover p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-extrabold mb-4 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            Thèmes existants
          </h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 skeleton"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {themes.map((theme) => (
                <div key={theme.id} className="card p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                          {theme.title}
                        </h3>
                        <span
                          className={`${theme.is_active ? "badge badge-success" : "badge badge-neutral"}`}
                        >
                          {theme.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mb-2">
                        {theme.description}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Date: {new Date(theme.date).toLocaleDateString("fr-FR")}
                      </p>
                      {/* Reference images display */}
                      {theme.reference_images && theme.reference_images.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {theme.reference_images.map((img) => (
                            <div key={img} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img} alt="ref" className="h-16 w-16 object-cover rounded" />
                              <button
                                onClick={() => removeReferenceImage(theme.id, img)}
                                className="absolute -top-2 -right-2 btn btn-sm btn-error"
                                type="button"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-start">
                      <button
                        onClick={() =>
                          toggleThemeStatus(theme.id, theme.is_active)
                        }
                        className={`${theme.is_active ? "btn-warning" : "btn-success"} h-9 px-3 text-sm w-full sm:w-auto`}
                      >
                        {theme.is_active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => deleteTheme(theme.id)}
                        className="btn-danger h-9 px-3 text-sm w-full sm:w-auto"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {themes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Aucun thème défini pour le moment.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
