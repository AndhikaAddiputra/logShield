import { useEffect, useState } from "react";
import logoWhite from "../../assets/logo-white.svg";

export function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 5;
      });
    }, 40);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ls-navy overflow-hidden">
      {/* Background Decorative Blurs */}
      <div className="absolute top-[-10%] left-[-10%] size-64 rounded-full bg-ls-accent/20 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] size-64 rounded-full bg-ls-accent/10 blur-3xl" />

      {/* Brand Section */}
      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        <div className="flex size-24 items-center justify-center rounded-[2rem] shadow-2xl shadow-ls-accent/20 transition-transform active:scale-95">
          <img src={logoWhite} alt="LogShield" className="size-14 object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">LogShield</h1>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ls-accent-soft/60">
            Secure Response
          </p>
        </div>
      </div>

      {/* Loading Progress */}
      <div className="absolute bottom-24 w-48 space-y-3">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-ls-accent transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40">
          {progress < 100 ? "Initializing System..." : "Ready"}
        </p>
      </div>

      {/* Version Footer */}
      <div className="absolute bottom-8 text-[10px] font-medium text-white/20">
        v1.2.0 • Command Center Mobile
      </div>
    </div>
  );
}
