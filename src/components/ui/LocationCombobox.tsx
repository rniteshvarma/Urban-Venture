"use client";

/**
 * Location box with suggestions. Focusing it lists the localities with the
 * most projects; typing narrows to matching localities and areas. ↑/↓ move,
 * Enter picks the highlighted suggestion (or searches when none is), Esc closes.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { rankLocations, type LocationSuggestion } from "@/lib/projects/location-search";

// One request per page view, shared by every box on the page.
let request: Promise<LocationSuggestion[]> | null = null;
function loadLocations(): Promise<LocationSuggestion[]> {
  request ??= fetch("/api/projects/locations")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      request = null; // retry on the next focus
      return [];
    });
  return request;
}

/** The suggestion name with the typed text in bold. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong style={{ fontWeight: 800 }}>{text.slice(i, i + q.length)}</strong>
      {text.slice(i + q.length)}
    </>
  );
}

export default function LocationCombobox({
  value,
  onChange,
  onPick,
  onSubmit,
  placeholder = "Location, e.g. Kokapet",
}: {
  value: string;
  onChange: (value: string) => void;
  /** a suggestion was chosen (onChange has already been called with its name) */
  onPick?: (suggestion: LocationSuggestion) => void;
  /** Enter with no suggestion highlighted */
  onSubmit: () => void;
  placeholder?: string;
}) {
  const [all, setAll] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    let alive = true;
    loadLocations().then((s) => alive && setAll(s));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const items = useMemo(() => rankLocations(all, value), [all, value]);
  const showList = open && items.length > 0;
  const showEmpty = open && value.trim() !== "" && items.length === 0 && all.length > 0;

  const pick = (s: LocationSuggestion) => {
    onChange(s.name);
    onPick?.(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && active >= 0 && items[active]) pick(items[active]);
      else {
        setOpen(false);
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={box} style={{ position: "relative", flex: 1, minWidth: 160 }}>
      <input
        className="input-premium"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        style={{ width: "100%" }}
      />

      {(showList || showEmpty) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 40,
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 14,
            boxShadow: "var(--uv-sh-lift)",
            padding: 6,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {showEmpty ? (
            <p style={{ margin: 0, padding: "10px 12px", fontSize: "0.8125rem", color: "var(--color-text-lo)" }}>
              No matching location. Press Enter to search all projects for &ldquo;{value.trim()}&rdquo;.
            </p>
          ) : (
            <>
              {!value.trim() && (
                <p style={{ margin: 0, padding: "6px 12px 4px", fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-lo)" }}>
                  Popular locations
                </p>
              )}
              <ul id={listId} role="listbox" aria-label="Location suggestions" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {items.map((s, i) => (
                  <li
                    key={`${s.area ?? "area"}:${s.name}`}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep focus in the input
                      pick(s);
                    }}
                    onMouseEnter={() => setActive(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      background: i === active ? "var(--color-saffron-wash)" : "transparent",
                    }}
                  >
                    <MapPin size={16} aria-hidden style={{ color: "var(--color-text-lo)", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <Highlighted text={s.name} query={value} />
                      </span>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--color-text-lo)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.area ?? "Area"}
                      </span>
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-mid)", whiteSpace: "nowrap" }}>
                      {s.count} {s.count === 1 ? "project" : "projects"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
