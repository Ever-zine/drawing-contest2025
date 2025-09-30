"use client";

import { useAuth } from "@/hooks/useAuth";
import Auth from "@/components/Auth";
import Navigation from "@/components/Navigation";
import DailyTheme from "@/components/DailyTheme";
import DrawingUpload from "@/components/DrawingUpload";
import Gallery from "@/components/Gallery";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="px-4 text-base sm:text-xl text-center">
          Chargement...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-padded py-10 sm:py-12 md:py-16">
        <div className="mx-auto max-w-3xl text-center mb-6 sm:mb-8 px-4">
          <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎨</div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-3 sm:mb-4">
            <span className="bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              Concours de Dessin
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Participez au concours de dessin quotidien avec vos amis !
          </p>
        </div>
        <div className="max-w-md mx-auto px-4 sm:px-0">
          <div className="card card-hover p-4 sm:p-6">
            <Auth />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-padded py-6 sm:py-8">
      <Navigation />

      <div className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
        <DailyTheme />
        <DrawingUpload />
        <Gallery />
      </div>
    </div>
  );
}
