import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-cream-bg">
      {/* Top AppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="font-headline-md font-bold text-primary">
              Pratibimba
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/help"
              className="text-on-surface-variant font-label-md cursor-pointer hover:text-primary transition-colors"
            >
              Help & Support
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-32 relative">
        {/* Atmospheric Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[5%] w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px]" />
          <div className="absolute -bottom-[10%] -left-[5%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
        </div>

        {children}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-outline-variant/30">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-label-md text-on-surface-variant">
            &copy; 2024 Rashtrotthana Group. All rights reserved.
          </span>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="font-label-md text-on-surface-variant hover:text-secondary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/security"
              className="font-label-md text-on-surface-variant hover:text-secondary transition-colors"
            >
              Security Audit
            </Link>
            <Link
              href="/compliance"
              className="font-label-md text-on-surface-variant hover:text-secondary transition-colors"
            >
              Compliance
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
