"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function OTPVerificationPage() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setTimeLeft(60);
    setCanResend(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length === 6) {
      window.location.href = "/reset-password";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-[480px]">
      {/* Centered White Card */}
      <div className="bg-surface-container-lowest rounded-xl p-8 md:p-12 border border-outline-variant/20 shadow-soft">
        {/* Branding/Icon Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-primary text-[32px]">
              shield_person
            </span>
          </div>
          <h1 className="font-headline-md text-on-surface mb-2">
            Verification Required
          </h1>
          <p className="font-body-md text-on-surface-variant px-4">
            For your security, we&apos;ve sent a 6-digit code to{" "}
            <span className="font-semibold text-on-surface">
              ad***@rashtrotthana.org
            </span>
          </p>
        </div>

        {/* OTP Input Grid */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2 md:gap-3">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-full aspect-square text-center font-headline-md font-bold bg-surface-container-low border border-outline-variant/50 rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            ))}
          </div>

          {/* Resend Logic */}
          <div className="text-center">
            {!canResend ? (
              <p className="font-label-md text-on-surface-variant mb-1">
                Resend code in{" "}
                <span className="font-data-mono text-on-surface-variant font-medium">
                  {formatTime(timeLeft)}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-secondary font-semibold font-label-md hover:underline"
              >
                Didn&apos;t receive the code? Resend
              </button>
            )}
          </div>

          {/* Action Button */}
          <button
            type="submit"
            className="w-full bg-primary text-on-primary rounded-lg font-headline-sm hover:bg-primary-container transition-all active:scale-[0.98] shadow-sm py-3.5 shadow-md"
          >
            Verify
          </button>
        </form>

        {/* Secure Info */}
        <div className="mt-8 pt-6 border-t border-outline-variant/10 flex items-center justify-center gap-2 opacity-60">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            lock
          </span>
          <span className="font-label-md text-[11px] uppercase tracking-wider text-on-surface-variant">
            Secure AES-256 Encrypted Session
          </span>
        </div>
      </div>
    </div>
  );
}
