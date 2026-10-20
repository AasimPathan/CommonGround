import logo from "@/assets/commonground-logo.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-lg font-bold", className)}>
      <span className="grid shrink-0 place-items-center rounded-md bg-card" style={{ width: size, height: size }}>
        <img src={logo.url} alt="" width={size} height={size} className="h-full w-full object-contain" />
      </span>
      <span>CommonGround</span>
    </span>
  );
}
