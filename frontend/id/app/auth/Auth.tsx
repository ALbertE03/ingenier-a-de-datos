"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "./Card";
import { LogOut, Shield, ShieldCheck, Lock, Unlock, Database, User as UserIcon, RefreshCw, AlertTriangle, BarChart3 } from "lucide-react";
import { UserProfile, ApiResult } from "./interfaces";
import { AnalyticsDashboard } from "./analytics/Dashboard";

export function Auth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"console" | "analytics">("analytics");

  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  const isMounted = useRef(true);
  const hasInitialized = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("auth_token");
    if (isMounted.current) {
      setToken(null);
      setUser(null);
      setApiResult(null);
      setApiError(null);
      setActiveEndpoint(null);
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = useCallback((authToken: string, userProfile: UserProfile) => {
    localStorage.setItem("auth_token", authToken);
    if (isMounted.current) {
      setToken(authToken);
      setUser(userProfile);
      setApiResult(null);
      setApiError(null);
      setActiveEndpoint(null);
    }
  }, []);

  const testEndpoint = useCallback(async (path: string, requiresAuth = false) => {
    if (!isMounted.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setApiLoading(true);
    setApiError(null);
    setApiResult(null);
    setActiveEndpoint(path);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (requiresAuth && token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1${path}`, {
        headers,
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json() as ApiResult | { detail: string };

      if (!response.ok) {
        const errorDetail = (data as { detail: string }).detail;
        throw new Error(errorDetail || `Error ${response.status}: ${response.statusText}`);
      }

      if (isMounted.current) {
        setApiResult(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "Error al realizar la consulta.";
      if (isMounted.current) {
        setApiError(errorMessage);
      }
    } finally {
      if (isMounted.current) {
        setApiLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const checkAuth = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      const savedToken = localStorage.getItem("auth_token");

      if (!savedToken) {
        if (isMounted.current) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (!isMounted.current) return;

        if (response.ok) {
          const data = await response.json() as UserProfile;
          setToken(savedToken);
          setUser(data);
        } else {
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (isMounted.current) {
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    checkAuth();
  }, []);

  const endpoints = useMemo(() => [
    {
      id: 'summary',
      path: '/analytics/summary',
      requiresAuth: false,
      title: 'Resumen General',
      badge: 'Analytics',
      badgeColor: 'emerald',
      description: 'Métricas globales: total registros, rutas, ubicaciones, promedios y máximos.',
      code: 'GET /api/v1/analytics/summary',
    },
    {
      id: 'routes',
      path: '/analytics/delays-by-route',
      requiresAuth: false,
      title: 'Retrasos por Ruta',
      badge: 'Analytics',
      badgeColor: 'violet',
      description: 'Todas las rutas ordenadas por cantidad de retrasos, con promedio y máximo.',
      code: 'GET /api/v1/analytics/delays-by-route',
    },
    {
      id: 'categories',
      path: '/analytics/incident-categories',
      requiresAuth: false,
      title: 'Categorías de Incidente',
      badge: 'Analytics',
      badgeColor: 'amber',
      description: 'Categorías auto-descubiertas por clustering desde los datos CSV.',
      code: 'GET /api/v1/analytics/incident-categories',
    },
    {
      id: 'deep',
      path: '/analytics/deep-analysis',
      requiresAuth: false,
      title: 'Análisis Profundo',
      badge: 'ML',
      badgeColor: 'rose',
      description: 'Insights: ruta peor, mes pico, horas totales, tendencias, direcciones, severidad.',
      code: 'GET /api/v1/analytics/deep-analysis',
    },
    {
      id: 'anomalies',
      path: '/analytics/anomalies',
      requiresAuth: false,
      title: 'Anomalías (Outliers)',
      badge: 'ML',
      badgeColor: 'rose',
      description: 'Detección estadística de eventos anómalos con z-score ≥ 3.0.',
      code: 'GET /api/v1/analytics/anomalies',
    },
    {
      id: 'map',
      path: '/analytics/locations-with-coords?limit=50&geocode=true',
      requiresAuth: false,
      title: 'Mapa de Ubicaciones',
      badge: 'Maps',
      badgeColor: 'cyan',
      description: 'Ubicaciones con coordenadas geográficas para visualización en mapa.',
      code: 'GET /api/v1/analytics/locations-with-coords',
    },
  ], []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
        <p className="text-slate-400 mt-4 text-sm font-medium">Cargando sesión...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Card onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="w-full max-w-6xl p-6 md:p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl transition-all duration-500 hover:border-white/15 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl -z-10"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-white/10 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-white">TTC Streetcar Analytics</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Plataforma de análisis de retrasos de tranvías de Toronto
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <UserIcon size={16} className="text-violet-400" />
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-tight">{user.username}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user.email}</p>
            </div>
            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === "admin"
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              }`}>
              {user.role}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95 cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit mb-6">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "analytics"
              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BarChart3 size={14} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("console")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "console"
              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Lock size={14} />
          API Console
        </button>
      </div>

      {activeTab === "analytics" ? (
        <AnalyticsDashboard />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Lock size={12} className="text-violet-400" />
              Control de Acceso (Endpoints)
            </h3>

            {endpoints.map((endpoint) => (
              <button
                key={endpoint.id}
                onClick={() => testEndpoint(endpoint.path, endpoint.requiresAuth)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 active:scale-[0.99] cursor-pointer flex flex-col gap-1 ${
                  activeEndpoint === endpoint.path
                    ? endpoint.id === 'public'
                      ? "border-cyan-500/30 bg-cyan-500/10"
                      : endpoint.id === 'user'
                        ? "border-violet-500/30 bg-violet-500/10"
                        : "border-rose-500/30 bg-rose-500/10"
                    : "border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{endpoint.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5 ${
                    endpoint.id === 'public'
                      ? "bg-cyan-500/20 text-cyan-400"
                      : endpoint.id === 'user'
                        ? "bg-violet-500/20 text-violet-400"
                        : "bg-rose-500/20 text-rose-400"
                  }                  `}>
                    {endpoint.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{endpoint.description}</p>
                <code className={`text-[10px] mt-2 font-mono ${
                  endpoint.id === 'public'
                    ? "text-cyan-300"
                    : endpoint.id === 'user'
                      ? "text-violet-300"
                      : "text-rose-300"
                }`}>
                  {endpoint.code}
                </code>
              </button>
            ))}
          </div>

          <div className="lg:col-span-7 flex flex-col h-full min-h-[300px]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Database size={12} className="text-violet-400" />
              Consola de Respuesta API
            </h3>

            <div className="flex-1 p-5 rounded-2xl border border-white/10 bg-black/60 font-mono text-xs overflow-auto flex flex-col justify-between relative min-h-[250px]">
              {apiLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
                  <RefreshCw className="animate-spin text-violet-400 mb-2" size={24} />
                  <span className="text-slate-400 text-xs">Consultando API...</span>
                </div>
              )}

              {!activeEndpoint ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-8 text-center">
                  <Unlock size={32} className="opacity-30 mb-3" />
                  <p>Selecciona un endpoint en la izquierda para enviar una solicitud con tu token JWT.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-slate-500">Petición ejecutada:</span>
                    <span className="text-white font-semibold">{activeEndpoint}</span>
                  </div>

                  {apiError && (
                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 flex gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Acceso Denegado (403 / 401)</p>
                        <p className="mt-1 text-slate-300 font-sans leading-normal">{apiError}</p>
                      </div>
                    </div>
                  )}

                  {apiResult && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        200 OK - Petición Exitosa
                      </div>
                      <pre className="text-slate-300 bg-white/5 p-4 rounded-xl max-h-[220px] overflow-y-auto border border-white/5">
                        {JSON.stringify(apiResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[10px] text-slate-500 border-t border-white/5 pt-3 mt-4 flex items-center justify-between">
                <span>Token activo: {token ? `${token.slice(0, 12)}...${token.slice(-12)}` : "No token"}</span>
                <span className="text-[9px] uppercase bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded">Bearer Auth</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
