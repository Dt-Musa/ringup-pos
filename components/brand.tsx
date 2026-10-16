import Image from "next/image";

export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/assets/brand/ringup-symbol.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
    />
  );
}

export function BrandLogo({ width = 200, className = "" }: { width?: number; className?: string }) {
  return (
    <Image
      src="/assets/brand/ringup-logo.svg"
      alt="RingUp"
      width={width}
      height={Math.round((width * 96) / 440)}
      className={className}
    />
  );
}
