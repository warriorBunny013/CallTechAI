"use client";

import { Label } from "@/components/ui/label";
import { SUPPORTED_LANGUAGES, getLanguageLabel } from "@/lib/voice-library";

type Props = {
  value: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
};

export function LanguageMultiSelect({
  value,
  onChange,
  disabled,
  label = "Languages",
  hint = "Select every language callers may use. The first selected is the primary language.",
}: Props) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const on = value.includes(lang.code);
          return (
            <button
              key={lang.code}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange(
                  on
                    ? value.length > 1
                      ? value.filter((c) => c !== lang.code)
                      : value
                    : [...value, lang.code]
                )
              }
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                on
                  ? "bg-[#84CC16] text-black border-[#84CC16]"
                  : "border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-[#84CC16]/50"
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-gray-500">
          Primary: <span className="font-semibold text-gray-700 dark:text-gray-300">{getLanguageLabel(value[0])}</span>
          {value.length > 1 && (
            <>
              {" "}
              · Also: {value.slice(1).map(getLanguageLabel).join(", ")}
            </>
          )}
        </p>
      )}
    </div>
  );
}
