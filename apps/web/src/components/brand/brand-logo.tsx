import Image from "next/image";

type BrandLogoVariant = "icon" | "wordmark" | "dark-showcase";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}

const variants: Record<
  BrandLogoVariant,
  {
    src: string;
    sizes: string;
    containerClassName: string;
    imageClassName: string;
  }
> = {
  icon: {
    src: "/brand/logo-sin-titulo.png",
    sizes: "64px",
    containerClassName: "h-12 w-12",
    imageClassName: "object-contain"
  },
  wordmark: {
    src: "/brand/logo-con-titulo.png",
    sizes: "(max-width: 768px) 180px, 220px",
    containerClassName: "h-20 w-44 sm:h-24 sm:w-52",
    imageClassName: "object-contain scale-[1.8] translate-y-[14%]"
  },
  "dark-showcase": {
    src: "/brand/logo-fondo-negro.png",
    sizes: "(max-width: 768px) 220px, 320px",
    containerClassName: "h-[17rem] w-[15.5rem] sm:h-[20rem] sm:w-[18rem]",
    imageClassName: "object-contain"
  }
};

export function BrandLogo({
  variant = "icon",
  className,
  priority = false,
  alt = "Kumpa"
}: BrandLogoProps) {
  const config = variants[variant];
  const containerClassName = ["relative overflow-hidden", config.containerClassName, className]
    .filter(Boolean)
    .join(" ");
  const imageClassName = ["select-none", config.imageClassName].join(" ");

  return (
    <div className={containerClassName}>
      <Image
        src={config.src}
        alt={alt}
        fill
        priority={priority}
        sizes={config.sizes}
        className={imageClassName}
      />
    </div>
  );
}
