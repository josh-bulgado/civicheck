import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";

interface RegisterFormProps {
  onSubmit: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => void;
  status: "idle" | "pending" | "success" | "error";
  serverError?: string | null;
  successMessage?: string | null;
}

export function RegisterForm({
  onSubmit,
  status,
  serverError,
  successMessage,
}: RegisterFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

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

    onSubmit({
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  }

  return (
    <div className="auth-page flex min-h-dvh bg-[#f9fafb]">
      {/* Left — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1a4480] via-[#005ea2] to-[#0b4778] items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-32 left-16 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Create Your Account
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Join CiviCheck to check your requirements before your visit, submit
            requests online, and track their status from submission to release —
            no more repeat trips to the CCRO.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "See exact document requirements",
              "Submit requests online or walk-in",
              "Track your request in real time",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 text-xs text-white/50">
            <span>City Civil Registrar Office</span>
            <span>·</span>
            <span>City Government of Legazpi</span>
          </div>
        </div>
      </div>

      {/* Right — Form */}
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
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Fill in your details below to get started with CiviCheck.
            </p>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-medium">Account created!</p>
                  <p className="mt-1">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Server error */}
              {serverError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {serverError}
                </div>
              )}

              {/* Name fields — side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="register-first-name">First name</Label>
                  <div className="relative">
                    <Input
                      id="register-first-name"
                      type="text"
                      placeholder="Juan"
                      className="ps-9"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                      <User size={16} aria-hidden="true" />
                    </div>
                  </div>
                  {validationErrors.firstName && (
                    <p className="text-xs text-red-600">
                      {validationErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-last-name">Last name</Label>
                  <Input
                    id="register-last-name"
                    type="text"
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  {validationErrors.lastName && (
                    <p className="text-xs text-red-600">
                      {validationErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Input
                    id="register-email"
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
                {validationErrors.email && (
                  <p className="text-xs text-red-600">
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Input
                    id="register-password"
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
                <Label htmlFor="register-confirm-password">
                  Confirm password
                </Label>
                <div className="relative">
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
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
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
