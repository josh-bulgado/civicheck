import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

interface ResetPasswordFormProps {
  onSubmit: (password: string) => void;
  status: "idle" | "pending" | "success" | "error";
  serverError?: string | null;
}

export function ResetPasswordForm({
  onSubmit,
  status,
  serverError,
}: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
    onSubmit(password);
  }

  const showSuccess = submitted && status === "success";

  return (
    <div className="flex min-h-dvh">
      {/* Left — Form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Logo / Brand */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#003366] text-white">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[#003366] tracking-tight">
                CiviCheck
              </span>
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 pt-4">
              {showSuccess ? "Password updated!" : "Set a new password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {showSuccess
                ? "Your password has been reset successfully. You can now sign in with your new password."
                : "Enter your new password below. Make sure it's at least 6 characters."}
            </p>
          </div>

          {showSuccess ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <p className="font-medium">Password changed successfully</p>
                    <p className="mt-1">
                      You can now use your new password to sign in.
                    </p>
                  </div>
                </div>
              </div>

              <Link to="/login">
                <Button className="w-full">
                  <span className="flex items-center gap-2">
                    Go to sign in
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Server error */}
              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="reset-password">New password</Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    className="ps-9 pe-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                    <Lock size={16} aria-hidden="true" />
                  </div>
                  <button
                    className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-xs text-red-600">
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="reset-confirm-password">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    className="ps-9 pe-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                    <Lock size={16} aria-hidden="true" />
                  </div>
                  <button
                    className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-colors"
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} aria-hidden="true" />
                    ) : (
                      <Eye size={16} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-red-600">
                    {validationErrors.confirmPassword}
                  </p>
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
                    Updating password…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Reset password
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Right — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#003366] via-[#004080] to-[#1a5276] items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">Secure Your Account</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Choose a strong password to keep your CiviCheck account secure. Your
            personal information and document requests are protected by
            role-based access controls.
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
