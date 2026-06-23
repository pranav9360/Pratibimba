import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function OTPVerificationPage() {
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const handleVerifyOtp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");

    if (otp.trim().length < 4) {
      setErrorMessage("Please enter a valid OTP.");
      return;
    }

    setIsLoading(true);

    window.setTimeout(() => {
      setIsLoading(false);
      window.location.href = "/reset-password";
    }, 1000);
  };

  const handleResendOtp = () => {
    setSecondsLeft(60);
    setErrorMessage("");
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
          OTP Verification
        </h1>

        <p className="font-body-md text-on-surface-variant opacity-70">
          Enter the OTP sent to your registered email or mobile number.
        </p>
      </div>

      <form onSubmit={handleVerifyOtp} className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="otp"
            className="font-label-md text-on-surface-variant block"
          >
            Verification Code
          </label>

          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors">
              pin
            </span>

            <input
              type="text"
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              required
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-body-md text-on-surface tracking-widest"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full text-on-primary font-headline-sm rounded-lg transition-all shadow-lg transform active:scale-[0.98] bg-[#ea580c] hover:bg-[#d44d0b] py-4 shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      <div className="mt-6 text-center">
        {secondsLeft > 0 ? (
          <p className="font-body-md text-on-surface-variant opacity-70">
            Resend OTP in {secondsLeft}s
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResendOtp}
            className="font-label-md text-primary hover:underline transition-all"
          >
            Resend OTP
          </button>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-outline-variant/30 text-center">
        <Link
          href="/login"
          className="font-label-md text-primary hover:underline transition-all"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}