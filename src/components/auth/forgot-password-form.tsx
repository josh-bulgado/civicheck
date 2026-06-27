import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  KeyRound,
} from "lucide-react";

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => void;
  status: "idle" | "pending" | "success" | "error";
  serverError?: string | null;
}

export function ForgotPasswordForm({
  onSubmit,
  status,
  serverError,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setValidationError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address");
      return false;
    }
    setValidationError("");
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    onSubmit(email);
  }

  const showSuccess = submitted && status === "success";

  return (
    <div className="auth-page flex min-h-dvh bg-[#f9fafb]">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#1a4480] text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[#1a4480] tracking-tight">
                CiviCheck
              </span>
            </Link>
            <h1 className="text-2xl font-semibold text-[#1b1b1b] pt-4">
              {showSuccess ? "Check your email" : "Forgot your password?"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {showSuccess
                ? `We've sent a password reset link to ${email}. Please check your inbox and follow the instructions.`
                : "Enter your email address and we'll send you a link to reset your password."}
            </p>
          </div>

          {showSuccess ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="font-medium">Reset link sent!</p>
                    <p className="mt-1">
                      If an account exists with that email address, you'll
                      receive a password reset link shortly. Please also check
                      your spam folder.
                    </p>
                  </div>
                </div>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Server error */}
              {serverError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {serverError}
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    className="ps-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                    <Mail size={16} aria-hidden="true" />
                  </div>
                </div>
                {validationError && (
                  <p className="text-xs text-red-600">{validationError}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={status === "pending"}
              >
                {status === "pending" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Sending…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send reset link
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>

      {/* Right — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1a4480] via-[#005ea2] to-[#0b4778] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <KeyRound className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Reset Your Password</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            We'll help you get back into your account. Just enter the email
            address you registered with and we'll send you a secure link to
            create a new password.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-white/50">
            <span>City Civil Registrar Office</span>
            <span>·</span>
            <span>City Government of Legazpi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
