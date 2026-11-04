export default function Campo({ id, label, error, extra, ...props }) {
    return (
      <div>
        <label htmlFor={id} className="block text-xs font-medium text-suave">
          {label}
        </label>
        <div className="relative mt-1">
          <input
            id={id}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`h-12 w-full rounded-lg border bg-fondo px-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario ${
              error ? "border-red-500/60" : "border-borde"
            } ${extra ? "pr-16" : ""}`}
            {...props}
          />
          {extra}
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }