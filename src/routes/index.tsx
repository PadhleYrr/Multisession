import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  RotateCw,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Circle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DevDeck — Multi-Session Dashboard" },
      {
        name: "description",
        content:
          "Mobile multi-session developer dashboard with isolated workspaces and a formatting log terminal.",
      },
    ],
  }),
  component: DashboardPage,
});

const WORKSPACES = [0, 1, 2, 3] as const;
const BASE_URL = "http://localhost:5000/session/";

type Logs = Record<number, string>;

function formatLog(input: string): string {
  // Strip trailing spaces on each line + ensure exactly one space after every ";"
  return input
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/;\s*/g, "; ");
}

function DashboardPage() {
  const [active, setActive] = useState<number>(0);
  const [reloadKeys, setReloadKeys] = useState<Record<number, number>>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  });
  const [logs, setLogs] = useState<Logs>({ 0: "", 1: "", 2: "", 3: "" });
  const [panelOpen, setPanelOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});

  const activeUrl = `${BASE_URL}${active}`;
  const activeFormatted = useMemo(() => formatLog(logs[active] ?? ""), [logs, active]);

  const handleReload = () => {
    setReloadKeys((k) => ({ ...k, [active]: k[active] + 1 }));
  };

  const handleClearStorage = () => {
    const frame = iframeRefs.current[active];
    try {
      frame?.contentWindow?.localStorage?.clear();
      frame?.contentWindow?.sessionStorage?.clear();
    } catch {
      // cross-origin — swallow
    }
    handleReload();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFormatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface/60 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-accent/15 ring-1 ring-accent/40">
            <Terminal className="h-4 w-4 text-accent" />
          </div>
          <div className="leading-tight">
            <h1 className="font-mono text-sm font-semibold tracking-tight">DevDeck</h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              multi-session · mobile
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <Circle className="h-2 w-2 fill-accent text-accent" />
          <span>WS://{active}</span>
        </div>
      </header>

      {/* Workspace tabs */}
      <nav
        className="scrollbar-hide flex gap-2 overflow-x-auto border-b border-border bg-surface/40 px-3 py-2"
        aria-label="Workspaces"
      >
        {WORKSPACES.map((i) => {
          const isActive = active === i;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={[
                "shrink-0 rounded-md px-3.5 py-2 font-mono text-xs font-medium transition-all",
                isActive
                  ? "bg-accent text-accent-foreground glow-accent"
                  : "bg-surface-elevated text-muted-foreground ring-1 ring-border hover:text-foreground",
              ].join(" ")}
            >
              <span className="opacity-60">$</span> Workspace {i}
            </button>
          );
        })}
      </nav>

      {/* Viewport */}
      <section className="flex min-h-0 flex-1 flex-col bg-background p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 rounded-md bg-surface px-3 py-2 ring-1 ring-border">
            <span className="h-2 w-2 shrink-0 rounded-full bg-secondary-accent" />
            <code className="truncate font-mono text-[11px] text-muted-foreground">
              {activeUrl}
            </code>
          </div>
          <div className="flex gap-1.5">
            <IconBtn label="Reload container" onClick={handleReload}>
              <RotateCw className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Clear storage" onClick={handleClearStorage} variant="danger">
              <Trash2 className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-surface ring-1 ring-border">
          {WORKSPACES.map((i) => (
            <iframe
              key={`${i}-${reloadKeys[i]}`}
              ref={(el) => {
                iframeRefs.current[i] = el;
              }}
              src={`${BASE_URL}${i}`}
              title={`Workspace ${i}`}
              className={[
                "absolute inset-0 h-full w-full border-0 bg-background",
                active === i ? "visible opacity-100" : "invisible opacity-0",
              ].join(" ")}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ))}
          {/* Fallback overlay shows even if iframe fails (likely in preview) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 font-mono text-[10px] text-muted-foreground">
            iframe → {BASE_URL}
            {active}
          </div>
        </div>
      </section>

      {/* Log terminal panel */}
      <section
        className={[
          "border-t border-border bg-surface transition-[max-height] duration-300 ease-out",
          panelOpen ? "max-h-[55vh]" : "max-h-12",
        ].join(" ")}
      >
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-xs font-semibold">
              session.log
              <span className="ml-2 text-muted-foreground">ws-{active}</span>
            </span>
          </div>
          {panelOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {panelOpen && (
          <div className="flex flex-col gap-2 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <textarea
              value={logs[active] ?? ""}
              onChange={(e) =>
                setLogs((prev) => ({ ...prev, [active]: e.target.value }))
              }
              placeholder="paste params here…   key=val;next=val;deep=true"
              spellCheck={false}
              className="h-28 w-full resize-none rounded-md bg-background px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-muted-foreground/60 ring-1 ring-border focus:outline-none focus:ring-accent"
            />

            <div className="rounded-md bg-background ring-1 ring-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  formatted
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {activeFormatted.length} chars
                </span>
              </div>
              <pre className="max-h-28 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed text-accent">
                {activeFormatted || (
                  <span className="text-muted-foreground/60">
                    {"// output appears here"}
                  </span>
                )}
              </pre>
            </div>

            <button
              onClick={handleCopy}
              disabled={!activeFormatted}
              className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 font-mono text-sm font-semibold text-accent-foreground transition-all active:scale-[0.98] disabled:opacity-40 glow-accent"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Formatted Output"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={[
        "grid h-10 w-10 place-items-center rounded-md ring-1 transition-all active:scale-95",
        variant === "danger"
          ? "bg-surface text-danger ring-border hover:bg-danger/10 hover:ring-danger/50"
          : "bg-surface text-accent ring-border hover:bg-accent/10 hover:ring-accent/50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
