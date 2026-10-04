import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PermissionMatrix({
  permissions,
  loading,
  selectedRole,
  canEdit,
  onToggle,
}) {
  // Local pending state so toggles feel instant
  const [pending, setPending] = useState({});

  const grouped = useMemo(() => {
    const map = {};
    for (const p of permissions) {
      const resource = p.resource || "general";
      if (!map[resource]) map[resource] = [];
      map[resource].push(p);
    }
    // Sort resources alphabetically, actions within each
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([resource, items]) => [
        resource,
        items.sort((a, b) => a.action.localeCompare(b.action)),
      ]);
  }, [permissions]);

  const assignedIds = useMemo(
    () => new Set((selectedRole?.permissions || []).map((p) => p.id)),
    [selectedRole]
  );

  const handleToggle = async (permission) => {
    if (!canEdit || pending[permission.id]) return;
    setPending((s) => ({ ...s, [permission.id]: true }));
    try {
      await onToggle(permission);
    } finally {
      setPending((s) => {
        const next = { ...s };
        delete next[permission.id];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-ctex-elevated" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="h-11 animate-pulse rounded-xl bg-ctex-elevated"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-ctex-text-muted">
          No permissions found in the catalog.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto p-5">
      <div className="space-y-6">
        {grouped.map(([resource, items]) => (
          <section key={resource}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ctex-text-muted">
                {resource}
              </h4>
              <span className="text-[10px] text-ctex-text-muted">
                {
                  items.filter((p) =>
                    assignedIds.has(p.id)
                  ).length
                }
                /{items.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {items.map((permission) => {
                const isAssigned = assignedIds.has(permission.id);
                const isPending = !!pending[permission.id];
                const disabled = !canEdit || isPending;

                return (
                  <button
                    key={permission.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleToggle(permission)}
                    className={[
                      "group flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                      isAssigned
                        ? "border-ctex-blue/40 bg-ctex-blue/5"
                        : "border-ctex-border bg-ctex-elevated/40",
                      disabled && "cursor-not-allowed opacity-70",
                      canEdit &&
                        !isPending &&
                        "hover:border-ctex-blue/60 hover:bg-ctex-blue/5",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Checkbox */}
                    <span
                      className={[
                        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition",
                        isAssigned
                          ? "border-ctex-blue bg-ctex-blue"
                          : "border-ctex-border bg-transparent",
                      ].join(" ")}
                    >
                      <AnimatePresence>
                        {isPending ? (
                          <motion.span
                            key="spin"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-white/50 border-t-white"
                          />
                        ) : (
                          isAssigned && (
                            <motion.svg
                              key="check"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="h-2.5 w-2.5 text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20 6 9 17l-5-5" />
                            </motion.svg>
                          )
                        )}
                      </AnimatePresence>
                    </span>

                    {/* Label */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ctex-text">
                        {permission.name || permission.key}
                      </p>
                      <p className="truncate font-mono text-[10px] text-ctex-text-muted">
                        {permission.key}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}