"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "./Card";
import { LogOut, User as UserIcon } from "lucide-react";
import { UserProfile } from "./interfaces";
import { AnalyticsDashboard } from "./analytics/Dashboard";

export function Auth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    return () => { isMounted.current = false };
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("auth_token");
    if (isMounted.current) {
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = useCallback((authToken: string, userProfile: UserProfile) => {
    localStorage.setItem("auth_token", authToken);
    if (isMounted.current) {
      setToken(authToken);
      setUser(userProfile);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      const savedToken = localStorage.getItem("auth_token");
      if (!savedToken) {
        if (isMounted.current) setLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${savedToken}` },
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
        if (isMounted.current) setLoading(false);
      }
    };
    checkAuth();
  }, []);

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
    <div className="w-full p-6 md:p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl -z-10"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-white/10 gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-bold text-white">EcoTrans</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Sistema de Monitoreo de la Red de Transporte Urbano
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

      <AnalyticsDashboard />
    </div>
  );
}
