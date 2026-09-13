import { useEffect, useRef, type ReactNode } from "react";
export function Photo({
  name,
  alt,
  hero = false,
  className = "",
}: {
  name: string;
  alt: string;
  hero?: boolean;
  className?: string;
}) {
  const portrait = name.startsWith("professor");
  const vertical = [
    "studio-recepcao",
    "studio-logo-corredor",
    "studio-equipamentos-vertical",
  ].includes(name);
  return (
    <img
      className={className}
      src={`/images/${name}-800.webp`}
      srcSet={(hero ? [480, 800, 1400] : [480, 800, 1200])
        .map((w) => `/images/${name}-${w}.webp ${w}w`)
        .join(",")}
      sizes={
        hero
          ? "(max-width: 760px) 100vw, 70vw"
          : "(max-width: 760px) 100vw, 50vw"
      }
      width={hero ? 1400 : vertical ? 1152 : 1536}
      height={hero ? 788 : portrait || vertical ? 1536 : 1017}
      loading={hero ? "eager" : "lazy"}
      fetchPriority={hero ? "high" : "auto"}
      decoding="async"
      alt={alt}
    />
  );
}
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          node.classList.add("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="notice" role="status" aria-live="polite">
      {children}
    </p>
  );
}
