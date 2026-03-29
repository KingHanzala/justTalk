import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useLogin, useRegister, useResendCode, useVerifyCode } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import type { AuthFlowResponse, PendingVerification } from "@/types";
import { STORAGE_KEYS } from "@/utils/constants";

type AuthMode = "login" | "register" | "verify";

function getPendingVerification(): PendingVerification | null {
  const raw = localStorage.getItem(STORAGE_KEYS.pendingVerification);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PendingVerification;
  } catch {
    return null;
  }
}

export default function AuthPage() {
  const initialPending = getPendingVerification();
  const [mode, setMode] = useState<AuthMode>(initialPending ? "verify" : "login");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    username: initialPending?.username ?? "",
    email: initialPending?.email ?? "",
    password: "",
  });
  const [verification, setVerification] = useState<PendingVerification | null>(initialPending);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const verifyMutation = useVerifyCode();
  const resendMutation = useResendCode();

  const handleSuccess = (token: string) => {
    localStorage.setItem(STORAGE_KEYS.authToken, token);
    localStorage.removeItem(STORAGE_KEYS.pendingVerification);
    queryClient.invalidateQueries();
    setLocation("/");
  };

  const rememberVerification = (payload: PendingVerification) => {
    setVerification(payload);
    setFormData((current) => ({
      ...current,
      username: payload.username,
      email: payload.email,
    }));
    localStorage.setItem(STORAGE_KEYS.pendingVerification, JSON.stringify(payload));
  };

  const handleAuthResponse = (response: AuthFlowResponse) => {
    if (response.token) {
      handleSuccess(response.token);
      return;
    }

    if (response.verificationRequired) {
      rememberVerification({
        username: response.user.username,
        email: response.user.email,
      });
      setMode("verify");
      setVerificationCode("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "login") {
        const res = await loginMutation.mutateAsync({
          username: formData.username,
          password: formData.password,
        });
        handleAuthResponse(res);
      } else if (mode === "register") {
        const res = await registerMutation.mutateAsync({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        handleAuthResponse(res);
      } else {
        const targetUsername = verification?.username ?? formData.username;
        const res = await verifyMutation.mutateAsync({
          username: targetUsername,
          code: verificationCode,
        });
        handleAuthResponse(res);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "An error occurred. Please try again.");
    }
  };

  const handleResend = async () => {
    if (!verification?.username) {
      return;
    }
    setError("");
    try {
      const res = await resendMutation.mutateAsync({ username: verification.username });
      handleAuthResponse(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    }
  };

  const isPending =
    loginMutation.isPending ||
    registerMutation.isPending ||
    verifyMutation.isPending ||
    resendMutation.isPending;
  const isLogin = mode === "login";
  const isVerify = mode === "verify";

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <img
          src="/images/auth-bg.png"
          alt="Abstract Background"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center justify-between px-6 gap-12">
        <div className="flex-1 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center p-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 mb-6 shadow-2xl"
          >
            <MessageSquare className="w-8 h-8 text-primary" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight"
          >
            JustTalk,
            <br />
            <span className="text-gradient">beautifully live.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-zinc-400 max-w-md mx-auto md:mx-0"
          >
            A fast, verified, real-time messaging space for the people you actually want to hear from.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="hidden md:flex flex-col gap-4 mt-12 text-zinc-500 text-sm"
          >
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Verified accounts only</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Real-time delivery and typing presence</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Unread-first conversation design</div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md glass-panel p-8 rounded-[2rem] shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className={cn(
                  "text-lg font-display font-semibold transition-colors relative pb-2",
                  isLogin ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                Sign In
                {isLogin && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className={cn(
                  "text-lg font-display font-semibold transition-colors relative pb-2",
                  mode === "register" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                Create Account
                {mode === "register" && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
              <button
                onClick={() => verification && setMode("verify")}
                disabled={!verification}
                className={cn(
                  "text-lg font-display font-semibold transition-colors relative pb-2 disabled:opacity-40",
                  isVerify ? "text-white" : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                Verify
                {isVerify && <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout">
                <motion.div layout className="space-y-4">
                  {!isVerify && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Username</label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                        placeholder="johndoe"
                      />
                    </div>
                  )}

                  {mode === "register" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 mt-4">Email</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                        placeholder="john@example.com"
                      />
                    </motion.div>
                  )}

                  {!isVerify && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 mt-4">Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  {isVerify && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
                        <div className="mb-3 flex items-center gap-2 text-white">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Verify your JustTalk account
                        </div>
                        <div className="mb-4 flex items-center gap-2 text-zinc-400">
                          <Mail className="h-4 w-4" />
                          <span>{verification?.email ?? "Check your inbox"}</span>
                        </div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Verification Code</label>
                        <input
                          type="text"
                          required
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                          placeholder="6-digit code"
                        />
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={resendMutation.isPending || !verification}
                          className="mt-4 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                        >
                          {resendMutation.isPending ? "Sending..." : "Resend code"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && (
                <div className="p-3 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-8 py-3.5 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 group"
              >
                {isPending ? (
                  <Spinner size={20} className="text-white" />
                ) : (
                  <>
                    {mode === "login" ? "Welcome Back" : mode === "register" ? "Create JustTalk Account" : "Verify and Continue"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
