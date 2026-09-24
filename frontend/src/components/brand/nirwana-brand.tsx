"use client";

type NirwanaBrandProps = {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
};

export function NirwanaBrand({
  className = "",
  imageClassName = "",
  textClassName = "",
  showTagline = false,
}: NirwanaBrandProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0f1e37] shadow-sm ring-1 ring-black/5">
        <img
          src="/nirwana-n-mark.png"
          alt=""
          aria-hidden="true"
          className={`object-contain ${imageClassName}`}
          style={{
            width: 20,
            height: 20,
          }}
        />
      </div>

      <div className="min-w-0">
        <div
          className={`truncate text-[17px] font-semibold tracking-[-0.035em] text-slate-950 dark:text-white ${textClassName}`}
        >
          Nirwana
        </div>

        {showTagline && (
          <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Multilingual AI
          </div>
        )}
      </div>
    </div>
  );
}
