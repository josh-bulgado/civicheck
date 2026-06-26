import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useMutation } from "~/hooks/useMutation";
import { loginFn } from "~/routes/_authed/route";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle,
  FileText,
} from "lucide-react";

export function LoginForm({ redirect: redirectTo }: { redirect?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const loginMutation = useMutation<
    { data: { email: string; password: string } },
    { error: boolean; message: string; role: string | null }
  >({
    fn: useServerFn(loginFn),
    onSuccess: async (ctx) => {
      if (!ctx.data?.error && ctx.data?.role) {
        await router.invalidate();

        const role = ctx.data.role;
        if (role === "admin") {
          router.navigate({ to: "/admin-dashboard" });
        } else if (
          ["frontdesk", "staff", "archive", "legal", "cashier"].includes(role)
        ) {
          router.navigate({ to: "/staff-dashboard" });
        } else {
          // applicant or any other role — honour redirect if present
          if (redirectTo) {
            router.navigate({ to: redirectTo });
          } else {
            router.navigate({ to: "/" });
          }
        }
      }
    },
  });

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    loginMutation.mutate({
      data: { email, password },
    });
  }

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
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to access your requests, track their
              status, and manage your documents.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Server error */}
            {loginMutation.data?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {loginMutation.data.message}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Input
                  id="login-email"
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
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
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

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.status === "pending"}
            >
              {loginMutation.status === "pending" ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Brand panel (hidden on small screens) */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#003366] via-[#004080] to-[#1a5276] items-center justify-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full bg-white/5 blur-xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
        </div>
        <div className="relative z-10 max-w-md px-12 text-white text-center">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <FileText className="w-10 h-10 text-white/90" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Know What You Need.
            <br />
            Before You Need It.
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            CiviCheck shows you the exact requirements for your civil registry
            document request — then tracks it from submission to release, so
            you're not making repeat trips to the CCRO.
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
