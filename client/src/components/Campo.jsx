export default function Campo({ id, label, error, extra, ...props }) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium">
          {label}
        </label>
        <div className="relative mt-1.5">
          <input
            id={id}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`h-12 w-full rounded-xl border bg-fondo px-4 text-sm text-texto outline-none transition placeholder:text-suave/60 focus:border-primario focus:ring-4 focus:ring-primario/15 ${
              error ? "border-red-500/60" : "border-borde"
            } ${extra ? "pr-16" : ""}`}
            {...props}
          />
          {extra}
        </div>
        {error && (
          <p id={`${id}-error`} className="mt-1 text-xs text-peligro">
            {error}
          </p>
        )}
      </div>
    );
  }