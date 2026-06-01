"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = "/dashboard";
    }, 1500);
  };

  return (
    <div className="w-full max-w-[440px] bg-white rounded-xl shadow-soft p-8 md:p-12 z-10 border border-outline-variant/10">
      {/* Brand Section */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-8">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqYey4Z1UBFHG_Vs11mI5PFBpECQuPE8un9ee59nkG7fd7K7YpMZJ5HN0Cu5FnAtzXhtTiXSoWD7tP0kzqDnC0eClxQnYVTee2ylu7X4c47863YQa11kST0kKqULrUurfpNR-1ZceLSMlnMU9plS-51k1X0yplY0b3QxuyRtlXziMZWV_5QOZa3oRTbpZJJt1i96Sjt5g1dIXmSryNQEjLGzfqxEhP5NEC88Cv4lmP4GATvYJHNcLgbBewzVRUSb1-AbyARQNYSeJU"
            alt="Rashtrotthana Group Logo"
            width={64}
            height={64}
            className="rounded-lg mb-2"
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

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email/Mobile Field */}
        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="font-label-md text-on-surface-variant block"
          >
            Email or Mobile Number
          </label>
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors">
              person
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

        {/* Password Field */}
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
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors">
              lock
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
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* Remember Me */}
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

        {/* Submit Button */}
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

      {/* Secondary Action */}
      <div className="mt-8 pt-6 border-t border-outline-variant/30 text-center">
        <p className="font-body-md text-on-surface-variant opacity-70">
          Secure identity verification powered by Rashtrotthana Group
        </p>
      </div>
    </div>
  );
}
