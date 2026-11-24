import { cn } from "@/lib/utils";
import {
  BITBUCKET_ACCESS_LEVEL,
  BITBUCKET_ACCESS_LEVEL_OPTIONS,
  normalizeBitbucketAccessLevel,
} from "@/constants/bitbucketOAuthAccess";

/**
 * Read / Write picker for Bitbucket OAuth connect / reconnect.
 * @param {{
 *   value?: string,
 *   onChange: (level: 'read'|'write') => void,
 *   disabled?: boolean,
 *   idPrefix?: string,
 *   legend?: string,
 *   className?: string,
 * }} props
 */
export function BitbucketAccessLevelPicker({
  value = BITBUCKET_ACCESS_LEVEL.WRITE,
  onChange,
  disabled = false,
  idPrefix = "bb-access",
  legend = "Access level",
  className,
}) {
  const selected = normalizeBitbucketAccessLevel(value);

  return (
    <fieldset className={cn("space-y-2", className)} disabled={disabled}>
      <Legend className="text-sm font-medium text-foreground">{legend}</Legend>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={legend}>
        {BITBUCKET_ACCESS_LEVEL_OPTIONS.map((opt) => {
          const id = `${idPrefix}-${opt.value}`;
          const checked = selected === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-md border border-border p-3 text-left transition-colors",
                checked ? "border-foreground/40 bg-muted/40" : "hover:bg-muted/20",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="radio"
                  name={idPrefix}
                  value={opt.value}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onChange(normalizeBitbucketAccessLevel(opt.value))}
                  className="size-3.5 accent-foreground"
                />
                <span className="text-sm font-medium leading-none">{opt.label}</span>
              </div>
              <p className="pl-5 text-xs text-muted-foreground">{opt.description}</p>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Legend({ children, className }) {
  return <legend className={className}>{children}</legend>;
}
