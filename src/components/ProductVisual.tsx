import React from "react";

interface ProductVisualProps {
  imageKey: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function ProductVisual({ imageKey, name, size = "md" }: ProductVisualProps) {
  const dimensions =
    size === "sm"
      ? "w-11 h-11 rounded-xl"
      : size === "lg"
      ? "w-full h-32 rounded-2xl"
      : "w-full h-28 rounded-xl";

  const svgSize = size === "sm" ? 28 : size === "lg" ? 72 : 60;

  const getBgGradient = (key: string) => {
    switch (key) {
      case "coffee":
        return "bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/70";
      case "iced-tea":
        return "bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100/70";
      case "water":
        return "bg-gradient-to-br from-sky-50 via-cyan-50 to-blue-100/70";
      case "donut":
        return "bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100/70";
      case "noodles":
        return "bg-gradient-to-br from-yellow-50 via-orange-50 to-red-100/60";
      case "chips":
        return "bg-gradient-to-br from-amber-50 via-yellow-100/70 to-orange-100/70";
      case "tea-bottle":
        return "bg-gradient-to-br from-emerald-50 via-amber-50 to-orange-100/60";
      case "cup-noodle":
        return "bg-gradient-to-br from-red-50 via-orange-50 to-yellow-100/60";
      case "matcha":
        return "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100/70";
      case "croissant":
        return "bg-gradient-to-br from-amber-50 via-orange-100/60 to-yellow-100/70";
      default:
        return "bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-100/60";
    }
  };

  return (
    <div
      className={`${dimensions} ${getBgGradient(
        imageKey
      )} flex items-center justify-center relative overflow-hidden select-none border border-slate-100/80`}
      title={name}
    >
      {imageKey === "coffee" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="68" rx="18" ry="4" fill="#D97706" fillOpacity="0.18" />
          <path d="M25 26H55L51 64C50.6 66.2 48.7 68 46.5 68H33.5C31.3 68 29.4 66.2 29 64L25 26Z" fill="#FDF8F5" stroke="#78350F" strokeWidth="2" />
          <path d="M27 36H53L50.5 62C50.2 64 48.5 65.5 46.5 65.5H33.5C31.5 65.5 29.8 64 29.5 62L27 36Z" fill="#B45309" />
          <path d="M28 46C34 43 44 49 52 45L50.5 62C50.2 64 48.5 65.5 46.5 65.5H33.5C31.5 65.5 29.8 64 29.5 62L28 46Z" fill="#78350F" />
          <rect x="22" y="21" width="36" height="6" rx="3" fill="#E7E5E4" stroke="#78350F" strokeWidth="1.8" />
          <circle cx="34" cy="31" r="2" fill="#92400E" />
          <circle cx="44" cy="33" r="2.2" fill="#92400E" />
          <circle cx="39" cy="29" r="1.8" fill="#92400E" />
          <path d="M44 12L40 22" stroke="#10B981" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      )}

      {imageKey === "iced-tea" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="68" rx="17" ry="4" fill="#EA580C" fillOpacity="0.18" />
          <path d="M26 24H54L50 64C49.7 66.2 47.8 68 45.5 68H34.5C32.2 68 30.3 66.2 30 64L26 24Z" fill="#FFFBEB" stroke="#9A3412" strokeWidth="2" />
          <path d="M27.5 32H52.5L50 62C49.7 64 48 65.5 46 65.5H34C32 65.5 30.3 64 30 62L27.5 32Z" fill="#D97706" />
          <rect x="31" y="34" width="7" height="7" rx="1.5" fill="#FEF3C7" fillOpacity="0.85" />
          <rect x="41" y="36" width="7" height="7" rx="1.5" fill="#FEF3C7" fillOpacity="0.85" />
          <circle cx="51" cy="25" r="6" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.8" />
          <path d="M35 12L39 30" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}

      {imageKey === "water" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="69" rx="14" ry="3.5" fill="#0284C7" fillOpacity="0.18" />
          <rect x="34" y="12" width="12" height="6" rx="2" fill="#0284C7" />
          <path d="M34 18H46L50 28V63C50 65.8 47.8 68 45 68H35C32.2 68 30 65.8 30 63V28L34 18Z" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
          <rect x="30" y="35" width="20" height="14" fill="#0284C7" />
          <path d="M34 42H46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M31 53C36 51 44 55 49 53V63C49 65.2 47.2 67 45 67H35C32.8 67 31 65.2 31 63V53Z" fill="#7DD3FC" fillOpacity="0.65" />
        </svg>
      )}

      {imageKey === "donut" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="66" rx="22" ry="5" fill="#78350F" fillOpacity="0.16" />
          <circle cx="40" cy="40" r="24" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
          <path d="M18 38C18 26 28 17 40 17C52 17 62 26 62 38C62 42 59 45 56 44C53 43 52 47 48 47C44 47 43 43 40 43C37 43 35 47 31 47C27 47 26 43 23 44C20 45 18 42 18 38Z" fill="#57260E" />
          <circle cx="40" cy="40" r="8" fill="#FEF3C7" stroke="#92400E" strokeWidth="2" />
          <rect x="30" y="24" width="5" height="2.2" rx="1.1" transform="rotate(-20 30 24)" fill="#F43F5E" />
          <rect x="45" y="25" width="5" height="2.2" rx="1.1" transform="rotate(25 45 25)" fill="#38BDF8" />
          <rect x="25" y="34" width="5" height="2.2" rx="1.1" transform="rotate(15 25 34)" fill="#FACC15" />
          <rect x="49" y="35" width="5" height="2.2" rx="1.1" transform="rotate(-15 49 35)" fill="#10B981" />
        </svg>
      )}

      {imageKey === "noodles" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="66" rx="22" ry="4.5" fill="#B45309" fillOpacity="0.18" />
          <path d="M18 38C22 27 58 27 62 38H18Z" fill="#FBBF24" stroke="#B45309" strokeWidth="2" />
          <circle cx="46" cy="33" r="6" fill="#FFFFFF" stroke="#D97706" strokeWidth="1.5" />
          <circle cx="46" cy="33" r="2.8" fill="#F97316" />
          <circle cx="31" cy="34" r="3.5" fill="#10B981" />
          <path d="M15 38H65L59 58C57.5 62.5 53.5 65 48.5 65H31.5C26.5 65 22.5 62.5 21 58L15 38Z" fill="#FFFFFF" stroke="#0F2933" strokeWidth="2" />
          <path d="M21 45H59" stroke="#EF4444" strokeWidth="3" />
        </svg>
      )}

      {imageKey === "chips" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="68" rx="18" ry="4" fill="#D97706" fillOpacity="0.18" />
          <path d="M24 18L56 18L53 64L27 64L24 18Z" fill="#F59E0B" stroke="#B45309" strokeWidth="2" />
          <path d="M23 18H57" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
          <path d="M26 64H54" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
          <circle cx="40" cy="41" r="11" fill="#FEF3C7" />
          <ellipse cx="40" cy="41" rx="7" ry="5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
        </svg>
      )}

      {imageKey === "tea-bottle" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="69" rx="13" ry="3.5" fill="#78350F" fillOpacity="0.18" />
          <rect x="35" y="11" width="10" height="5" rx="1.5" fill="#16A34A" />
          <path d="M35 16H45L49 28V63C49 65.8 46.8 68 44 68H36C33.2 68 31 65.8 31 63V28L35 16Z" fill="#92400E" stroke="#451A03" strokeWidth="2" />
          <rect x="31" y="34" width="18" height="15" fill="#FEF3C7" />
          <circle cx="40" cy="41.5" r="4.5" fill="#16A34A" />
        </svg>
      )}

      {imageKey === "cup-noodle" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="68" rx="16" ry="4" fill="#DC2626" fillOpacity="0.16" />
          <path d="M24 20H56L51 64C50.7 66.2 48.8 68 46.5 68H33.5C31.2 68 29.3 66.2 29 64L24 20Z" fill="#FEE2E2" stroke="#DC2626" strokeWidth="2" />
          <rect x="22" y="17" width="36" height="5" rx="2.5" fill="#DC2626" />
          <path d="M26 32H54" stroke="#DC2626" strokeWidth="4" />
          <circle cx="40" cy="47" r="8" fill="#FACC15" />
        </svg>
      )}

      {imageKey === "matcha" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="68" rx="17" ry="4" fill="#059669" fillOpacity="0.18" />
          <path d="M25 25H55L51 64C50.6 66.2 48.7 68 46.5 68H33.5C31.3 68 29.4 66.2 29 64L25 25Z" fill="#ECFDF5" stroke="#065F46" strokeWidth="2" />
          <path d="M27 34H53L50.5 62C50.2 64 48.5 65.5 46.5 65.5H33.5C31.5 65.5 29.8 64 29.5 62L27 34Z" fill="#10B981" />
          <path d="M44 12L40 24" stroke="#065F46" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      )}

      {imageKey === "croissant" && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <ellipse cx="40" cy="64" rx="22" ry="4.5" fill="#B45309" fillOpacity="0.16" />
          <path d="M16 46C14 34 25 24 40 24C55 24 66 34 64 46C63 52 56 54 52 48C49 43 45 41 40 41C35 41 31 43 28 48C24 54 17 52 16 46Z" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
          <path d="M28 28C32 35 32 41 29 46" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
          <path d="M52 28C48 35 48 41 51 46" stroke="#92400E" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {(imageKey === "snacks" || imageKey === "bag" || !["coffee", "iced-tea", "water", "donut", "noodles", "chips", "tea-bottle", "cup-noodle", "matcha", "croissant"].includes(imageKey)) && (
        <svg width={svgSize} height={svgSize} viewBox="0 0 80 80" fill="none">
          <rect x="24" y="24" width="32" height="38" rx="6" fill="#10B981" fillOpacity="0.18" stroke="#059669" strokeWidth="2" />
          <path d="M32 24V20C32 15.6 35.6 12 40 12C44.4 12 48 15.6 48 20V24" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="40" cy="43" r="7" fill="#10B981" />
        </svg>
      )}
    </div>
  );
}
