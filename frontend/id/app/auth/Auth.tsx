"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "./Card";
import { LogOut, User as UserIcon, BarChart3, AlertTriangle, Shield } from "lucide-react";
import { UserProfile } from "./interfaces";
import { AnalyticsDashboard } from "./analytics/Dashboard";
import { IncidentDashboard } from "./incidents/IncidentDashboard";

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1`;

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
        const response = await fetch(`${API}/auth/me`, {
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

  const [activeTab, setActiveTab] = useState<"analytics" | "incidents">("analytics");

  const tabs = [];
  if (user.role === "admin" || user.role === "analyst") {
    tabs.push({ id: "analytics" as const, label: "Analítica", icon: BarChart3 });
  }
  if (user.role === "admin" || user.role === "inspector") {
    tabs.push({ id: "incidents" as const, label: "Incidentes", icon: AlertTriangle });
  }
  if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
    setActiveTab(tabs[0].id);
  }

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-400 border-red-500/30",
    inspector: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    analyst: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };

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
            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${roleColors[user.role] || "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"}`}>
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

      {tabs.length > 1 && (
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
          {user.role === "admin" && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 cursor-pointer" title="Admin">
              <Shield size={14} />
            </button>
          )}
        </div>
      )}

      {activeTab === "analytics" && <AnalyticsDashboard />}
      {activeTab === "incidents" && <IncidentDashboard token={token} />}
    </div>
  );
}
