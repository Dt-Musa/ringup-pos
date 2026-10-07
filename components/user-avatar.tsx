import Image from "next/image";

type UserAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md";
};

export function UserAvatar({ name, photoUrl, size = "md" }: UserAvatarProps) {
  const dimension = size === "sm" ? "h-9 w-9 text-sm" : "h-10 w-10 text-base";
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  if (photoUrl) {
    return <Image src={photoUrl} alt="" width={40} height={40} className={`${dimension} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span className={`flex ${dimension} shrink-0 items-center justify-center rounded-full bg-emerald-600 font-semibold text-white`}>
      {initial}
    </span>
  );
}
