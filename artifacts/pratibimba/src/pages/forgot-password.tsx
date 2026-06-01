import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="w-full max-w-[440px]">
      <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col border border-outline-variant/20 shadow-lg gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px] text-primary">lock_reset</span>
          </div>
          <h1 className="font-headline-md text-on-surface mb-2">Forgot Password?</h1>
          <p className="font-body-md text-on-surface-variant max-w-[320px] mb-4">
            No worries, it happens. Enter your email or mobile number and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <label htmlFor="identifier" className="font-label-md text-on-surface-variant ml-1">
              Email or Mobile Number
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors">
                alternate_email
              </span>
              <input
                type="text"
                id="identifier"
                name="identifier"
                placeholder="name@company.com"
                required
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none bg-white font-body-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isSubmitted}
            className="w-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary py-3 px-6 rounded-lg font-headline-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-md font-bold disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Sending...
              </>
            ) : isSubmitted ? (
              "Reset Link Sent"
            ) : (
              <>
                Send Reset Link
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center pt-6 border-t border-outline-variant/10">
          <Link href="/login" className="flex items-center gap-2 font-body-md text-primary hover:underline transition-all group">
            <span className="material-symbols-outlined text-[18px]">keyboard_backspace</span>
            Back to Login
          </Link>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="font-body-md text-on-surface-variant opacity-60">
          Secure identity verification powered by Rashtrotthana Group
        </p>
      </div>
    </div>
  );
}
