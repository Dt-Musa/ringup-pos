export type IconName =
  | "archive"
  | "download"
  | "edit"
  | "eye"
  | "file-text"
  | "key"
  | "minus"
  | "package-minus"
  | "package-plus"
  | "plus"
  | "receipt"
  | "sliders"
  | "user-plus"
  | "x";

const PATHS: Record<IconName, string> = {
  archive: "M4 7h16v13H4V7Zm2-4h12l2 4H4l2-4Zm2 9h8",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 20h16",
  edit: "m4 16-.8 4.8L8 20l11.2-11.2a2.1 2.1 0 0 0-3-3L5 17",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "file-text": "M6 3h9l3 3v15H6V3Zm8 0v4h4M9 12h6M9 16h6M9 8h2",
  key: "m15 7 2-2m-2 2 2 2m-2-2H9a4 4 0 1 0 0 8h2l2-2h2l2-2",
  minus: "M5 12h14",
  "package-minus": "m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M8 9v10m8-10v10M9 15h6",
  "package-plus": "m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M8 9v10m8-10v10M9 15h6m-3-3v6",
  plus: "M12 5v14M5 12h14",
  receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm3 5h8M8 12h8M8 16h5",
  sliders: "M4 6h16M4 12h16M4 18h16M8 4v4m8 2v4m-5 6v4",
  "user-plus": "M15 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-3v6m-3-3h6",
  x: "m6 6 12 12M18 6 6 18",
};

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}
