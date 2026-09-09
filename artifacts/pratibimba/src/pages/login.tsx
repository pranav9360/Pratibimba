import { useState } from "react";
import { Link } from "wouter";

const API_URL = `${
  import.meta.env.VITE_API_URL || "https://pratibimba-backend-final.onrender.com/api/v1"
}/auth/login`;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    const identifier = formData.get("identifier");
    const password = formData.get("password");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = await response.json();

      console.log("LOGIN RESPONSE:", data);

      if (!response.ok) {
        alert(data.message || "Login failed");
        return;
      }

      // Backend returns { success, message, data: { token, user } }

      localStorage.setItem(
        "token",
        data.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.data.user)
      );

      window.location.href = "/dashboard";
    } catch (err) {
        console.error("LOGIN ERROR:", err);

        if (err instanceof Error) {
          alert(`ERROR: ${err.message}`);
        } else {
          alert(`ERROR: ${JSON.stringify(err)}`);
        }
      }
    finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-xl shadow-soft p-8 md:p-12 z-10 border border-outline-variant/10">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-8">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqYey4Z1UBFHG_Vs11mI5PFBpECQuPE8un9ee59nkG7fd7K7YpMZJ5HN0Cu5FnAtzXhtTiXSoWD7tP0kzqDnC0eClxQnYVTee2ylu7X4c47863YQa11kST0kKqULrUurfpNR-1ZceLSMlnMU9plS-51k1X0yplY0b3QxuyRtlXziMZWV_5QOZa3oRTbpZJJt1i96Sjt5g1dIXmSryNQEjLGzfqxEhP5NEC88Cv4lmP4GATvYJHNcLgbBewzVRUSb1-AbyARQNYSeJU"
            alt="Rashtrotthana Group Logo"
            width={64}
            height={64}
            className="rounded-lg mb-2 w-16 h-16 object-cover"
          />

          <p className="font-label-md text-secondary uppercase tracking-widest font-bold">
            Rashtrotthana Group
          </p>
        </div>

        <h1 className="font-display-lg text-on-surface font-bold tracking-tight mb-2">
          Welcome Back
        </h1>

        <p className="font-body-md text-on-surface-variant opacity-70">
          Enter your credentials to access the audit portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="font-label-md text-on-surface-variant block"
          >
            Email or Mobile Number
          </label>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </span>

            <input
              type="text"
              id="identifier"
              name="identifier"
              placeholder="name@company.com"
              required
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-body-md text-on-surface"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label
              htmlFor="password"
              className="font-label-md text-on-surface-variant block"
            >
              Password
            </label>

            <Link
              href="/forgot-password"
              className="font-label-md text-primary hover:underline transition-all"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>

            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              placeholder="••••••••"
              required
              className="w-full pl-11 pr-11 py-3 rounded-lg border border-gray-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-body-md text-on-surface"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.583c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remember"
            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
          />

          <label
            htmlFor="remember"
            className="font-body-md text-on-surface-variant select-none cursor-pointer"
          >
            Keep me logged in
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-on-primary font-headline-sm rounded-lg transition-all shadow-lg transform active:scale-[0.98] bg-[#ea580c] hover:bg-[#d44d0b] py-4 shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>

              Authenticating...
            </>
          ) : (
            "Sign In to Pratibimba"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-outline-variant/30 text-center">
        <p className="font-body-md text-on-surface-variant opacity-70">
          Secure identity verification powered by Rashtrotthana Group
        </p>
      </div>
    </div>
  );
}
