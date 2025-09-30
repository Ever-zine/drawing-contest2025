"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");

  // TODO : ajouter le user à la table user lors de la création du compte

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Vérifiez votre email pour confirmer votre compte !");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-extrabold text-center mb-6 bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
        {isSignUp ? "Créer un compte" : "Se connecter"}
      </h2>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1"
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input mt-1"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full h-10"
        >
          {loading
            ? "Chargement..."
            : isSignUp
              ? "Créer un compte"
              : "Se connecter"}
        </button>
      </form>

      {message && <div className="alert alert-info mt-4">{message}</div>}

      <div className="mt-4 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200 text-sm"
        >
          {isSignUp
            ? "Déjà un compte ? Se connecter"
            : "Pas de compte ? S'inscrire"}
        </button>
      </div>
    </div>
  );
}
