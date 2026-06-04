"use client";

import { lazy, Suspense } from "react";
//import { Auth } from "./auth/Auth";

// Lazy load components if needed
const Auth = lazy(() => import("./auth/Auth").then(mod => ({ default: mod.Auth })));

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen bg-[#080710] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
  </div>
);

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080710] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Simplified background - removed heavy glow effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/5 via-transparent to-transparent pointer-events-none"></div>

      {/* Simplified grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-50"></div>

      <div className="w-full flex flex-col items-center justify-center relative z-10 space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold tracking-wide uppercase">
            Acceso Seguro
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">
            Portal de <span className="bg-gradient-to-r from-violet-400 via-indigo-200 to-cyan-400 bg-clip-text text-transparent">Acceso</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Inicia sesión para acceder a los recursos protegidos
          </p>
        </div>

        <Suspense fallback={<LoadingFallback />}>
          <Auth />
        </Suspense>

        <p className="text-xs text-slate-600 pt-2">
          Sistema de Autenticación v1.0
        </p>
      </div>
    </main>
  );
}