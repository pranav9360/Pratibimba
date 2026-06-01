import { useState, useMemo } from "react";
import { Link } from "wouter";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const getStrengthLabel = () => {
    if (password.length === 0) return "Enter Password";
    if (strength <= 2) return "Weak";
    if (strength === 3) return "Moderate";
    return "Strong";
  };

  const getStrengthColor = (index: number) => {
    if (index >= strength) return "bg-outline-variant";
    if (strength <= 2) return "bg-error";
    if (strength === 3) return "bg-secondary-container";
    return "bg-secondary";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setIsSuccess(true);
  };

  return (
    <div className="w-full max-w-[480px] bg-white p-8 rounded-xl border border-outline-variant/20 relative overflow-hidden shadow-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary-container to-secondary" />

      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-fixed mb-4">
          <span className="material-symbols-outlined text-primary text-[32px]">lock_reset</span>
        </div>
        <h1 className="font-headline-md text-on-surface mb-1">Reset Your Password</h1>
        <p className="text-on-surface-variant font-body-md font-medium">
          Ensure your account remains secure with a new, strong password.
        </p>
      </div>

      {isSuccess && (
        <div className="mb-6 p-4 bg-surface-container-high rounded-lg border border-secondary/20 flex items-start gap-4">
          <span className="material-symbols-outlined text-secondary">check_circle</span>
          <div>
            <p className="font-label-md text-on-secondary-container font-bold">Password Reset Successful</p>
            <p className="font-body-md text-on-secondary-container/80">
              Your security credentials have been updated. You can now sign in with your new password.
            </p>
          </div>
        </div>
      )}

      {!isSuccess && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block font-label-md font-semibold text-on-surface-variant">
              New Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">key</span>
              <input
                type={showPassword ? "text" : "password"}
                id="new-password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-2 py-1">
            <div className="flex justify-between items-center">
              <span className="font-label-md text-on-surface-variant/80 font-medium">Password Strength</span>
              <span className={`font-data-mono text-[10px] uppercase tracking-widest ${strength <= 2 && password.length > 0 ? "text-error font-bold" : strength > 2 ? "text-secondary font-bold" : "text-on-surface-variant"}`}>
                {getStrengthLabel()}
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-full w-1/4 transition-colors duration-300 ${getStrengthColor(i)}`} />
              ))}
            </div>
            <ul className="text-[12px] text-on-surface-variant/70 grid grid-cols-2 gap-x-4 mt-2">
              <li className={`flex items-center gap-1.5 ${password.length >= 8 ? "text-secondary" : ""}`}>
                <span className="material-symbols-outlined text-[16px]">{password.length >= 8 ? "check_circle" : "circle"}</span>
                8+ characters
              </li>
              <li className={`flex items-center gap-1.5 ${/[^A-Za-z0-9]/.test(password) ? "text-secondary" : ""}`}>
                <span className="material-symbols-outlined text-[16px]">{/[^A-Za-z0-9]/.test(password) ? "check_circle" : "circle"}</span>
                Special symbol
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block font-label-md font-semibold text-on-surface-variant">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-[20px]">lock</span>
              <input
                type="password"
                id="confirm-password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <button type="submit" className="w-full mt-6 py-3.5 bg-primary text-white font-label-md font-bold rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-md">
            Reset Password
          </button>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-outline-variant/30 flex justify-center">
        <Link href="/login" className="text-primary font-label-md font-semibold flex items-center gap-1 hover:gap-2 transition-all">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
