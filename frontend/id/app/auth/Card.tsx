"use client";

import React, { useState, useCallback, useMemo, memo } from "react";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

// Types
interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface CardProps {
  onSuccess: (token: string, user: UserProfile) => void;
}

// Memoized input component to prevent re-renders
const InputField = memo(({
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  showPasswordToggle = false,
  onTogglePassword
}: {
  icon: React.ElementType;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
}) => (
  <div className="relative">
    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
      <Icon size={18} />
    </span>
    <input
      type={type}
      required
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-11 pr-11 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-violet-500 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/50"
    />
    {showPasswordToggle && onTogglePassword && (
      <button
        type="button"
        onClick={onTogglePassword}
        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
      >
        {type === "password" ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    )}
  </div>
));

InputField.displayName = 'InputField';

export const Card = memo(function Card({ onSuccess }: CardProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const baseUrl = "http://localhost:8000/api";

    try {
      if (isLogin) {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Error al iniciar sesión");
        }

        const token = data.access_token;
        const profileResponse = await fetch(`${baseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userProfile = await profileResponse.json();

        setSuccess("¡Sesión iniciada con éxito! Redirigiendo...");
        setTimeout(() => {
          onSuccess(token, userProfile);
        }, 500); // Reduced timeout for faster redirect
      } else {
        const response = await fetch(`${baseUrl}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password, role: "user" }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Error al registrar usuario");
        }

        setSuccess("¡Usuario creado con éxito! Iniciando sesión...");

        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
          setTimeout(() => {
            onSuccess(loginData.access_token, data);
          }, 500);
        } else {
          setIsLogin(true);
          setIsLoading(false);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Algo salió mal. Por favor intenta de nuevo.";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isLogin, username, password, email, onSuccess]);

  const toggleAuthMode = useCallback(() => {
    setIsLogin(prev => !prev);
    setError("");
    setSuccess("");
    setUsername("");
    setEmail("");
    setPassword("");
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Memoized values to prevent re-renders
  const title = useMemo(() => isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta", [isLogin]);
  const subtitle = useMemo(() => isLogin
    ? "Introduce tus credenciales para acceder"
    : "Completa el formulario para registrarte", [isLogin]);
  const buttonText = useMemo(() => isLogin ? "Iniciar Sesión" : "Crear Cuenta", [isLogin]);
  const toggleText = useMemo(() => isLogin ? "Regístrate aquí" : "Inicia sesión aquí", [isLogin]);
  const toggleMessage = useMemo(() => isLogin ? "¿No tienes una cuenta? " : "¿Ya tienes una cuenta? ", [isLogin]);

  return (
    <div className="w-full max-w-md p-6 md:p-8 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs animate-fade-in">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Nombre de Usuario
          </label>
          <InputField
            icon={User}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ej. alberto"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Correo Electrónico
            </label>
            <InputField
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Contraseña
          </label>
          <InputField
            icon={Lock}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            showPasswordToggle
            onTogglePassword={togglePasswordVisibility}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              {buttonText}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs">
        <span className="text-slate-400">{toggleMessage}</span>
        <button
          onClick={toggleAuthMode}
          className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4 transition-colors ml-1"
        >
          {toggleText}
        </button>
      </div>
    </div>
  );
});