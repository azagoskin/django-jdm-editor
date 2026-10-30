import {
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import {
  DecisionGraph,
  GraphSimulator,
  JdmConfigProvider,
  type Simulation,
} from "@gorules/jdm-editor";
import { ConfigProvider } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import "./styles.css";

type DecisionGraphType = {
  nodes: unknown[];
  edges: unknown[];
  [key: string]: unknown;
};

const EMPTY_GRAPH: DecisionGraphType = { nodes: [], edges: [] };

type InputEl = HTMLInputElement | HTMLTextAreaElement;

// Track mounted containers so re-runs (e.g. admin inline formset events) don't
// double-mount onto the same node.
const mounted = new WeakMap<HTMLElement, Root>();

function parseInitial(input: InputEl): DecisionGraphType {
  const raw = (input.value ?? "").trim();
  if (!raw) {
    return EMPTY_GRAPH;
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        ...parsed,
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
        edges: Array.isArray(parsed.edges) ? parsed.edges : [],
      };
    }
  } catch (err) {
    console.warn("[django-jdm-editor] could not parse initial JDM value:", err);
  }
  return EMPTY_GRAPH;
}

function getCookie(name: string): string {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function Overlay({
  graph,
  disabled,
  simulateUrl,
  onChange,
  onClose,
}: {
  graph: DecisionGraphType;
  disabled: boolean;
  simulateUrl: string;
  onChange: (g: DecisionGraphType) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [simulation, setSimulation] = useState<Simulation | undefined>(undefined);

  // POST {graph, context} to the configured endpoint and feed the result back
  // into the editor's Simulator panel. Expects {performance, result, trace} on
  // success, or an {error: {...}} payload.
  const handleRun = useCallback(
    async ({ context }: { graph: unknown; context: unknown }) => {
      try {
        const resp = await fetch(simulateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
          body: JSON.stringify({ graph, context }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || data?.error) {
          setSimulation({
            error: {
              message: data?.error?.message ?? data?.detail ?? `HTTP ${resp.status}`,
              data: data?.error?.data ?? {},
            },
          });
          return;
        }
        setSimulation({
          result: {
            performance: data.performance ?? "",
            result: data.result,
            snapshot: graph as never,
            trace: data.trace ?? {},
          },
        });
      } catch (err) {
        setSimulation({
          error: { message: String(err), data: {} },
        });
      }
    },
    [simulateUrl],
  );

  const panels = useMemo(() => {
    if (!simulateUrl) return undefined;
    return [
      {
        id: "simulator",
        title: "Simulator",
        icon: <PlayCircleOutlined />,
        renderPanel: () => (
          <GraphSimulator
            onRun={handleRun}
            onClear={() => setSimulation(undefined)}
          />
        ),
      },
    ];
  }, [simulateUrl, handleRun]);

  // Close on Escape and lock background scroll while the overlay is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="jdm-overlay" role="dialog" aria-modal="true" ref={overlayRef}>
      <div className="jdm-overlay__bar">
        <span className="jdm-overlay__title">
          Decision editor{disabled ? " (read-only)" : ""}
        </span>
        <button type="button" className="jdm-overlay__done" onClick={onClose}>
          Done ✓
        </button>
      </div>
      <div className="jdm-overlay__canvas">
        {/* Render antd popups (dropdowns, selects, tooltips, menus) INSIDE the
            overlay so they stack above the editor instead of behind this
            fullscreen layer — otherwise the editor's upload/download menus and
            all other popups open underneath and look broken. */}
        <JdmConfigProvider>
          <ConfigProvider getPopupContainer={() => overlayRef.current ?? document.body}>
            <DecisionGraph
              value={graph as never}
              onChange={(g) => {
                setSimulation(undefined);
                onChange(g as DecisionGraphType);
              }}
              disabled={disabled}
              panels={panels}
              simulate={simulation}
            />
          </ConfigProvider>
        </JdmConfigProvider>
      </div>
    </div>,
    document.body,
  );
}

// Human-readable fallback labels for JDM node types (used when a node is unnamed).
const NODE_TYPE_LABELS: Record<string, string> = {
  inputNode: "Request",
  outputNode: "Response",
  decisionTableNode: "decision table",
  functionNode: "function",
  expressionNode: "expression",
  switchNode: "switch",
  decisionNode: "sub-decision",
};

// Color marker per node type in the preview (graph I/O nodes are not listed).
const NODE_TYPE_COLORS: Record<string, string> = {
  decisionTableNode: "#2563eb",
  expressionNode: "#7c3aed",
  functionNode: "#ea580c",
  switchNode: "#9333ea",
  decisionNode: "#0ea5e9",
};
const DEFAULT_NODE_COLOR = "#94a3b8";

// Graph input/output nodes are excluded from the preview — only the actual
// decision ("check") nodes are shown and counted.
const IO_NODE_TYPES = new Set(["inputNode", "outputNode"]);

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

type PreviewItem = { name: string; color: string };

/** Short, informative graph summary for the collapsed preview card. */
function summarize(graph: DecisionGraphType): {
  items: PreviewItem[];
  rest: number;
  count: number;
} {
  const nodes = Array.isArray(graph.nodes) ? (graph.nodes as Record<string, unknown>[]) : [];

  const checks = nodes.filter(
    (n) => !IO_NODE_TYPES.has(typeof n?.type === "string" ? n.type : ""),
  );

  const items: PreviewItem[] = checks.slice(0, 6).map((n) => {
    const type = typeof n?.type === "string" ? n.type : "";
    const name = typeof n?.name === "string" ? n.name.trim() : "";
    return {
      name: name || NODE_TYPE_LABELS[type] || type || "node",
      color: NODE_TYPE_COLORS[type] ?? DEFAULT_NODE_COLOR,
    };
  });

  return { items, rest: checks.length - items.length, count: checks.length };
}

function WidgetApp({
  input,
  initial,
  disabled,
  simulateUrl,
}: {
  input: InputEl;
  initial: DecisionGraphType;
  disabled: boolean;
  simulateUrl: string;
}) {
  const [graph, setGraph] = useState<DecisionGraphType>(initial);
  const [open, setOpen] = useState(false);

  const handleChange = useCallback(
    (g: DecisionGraphType) => {
      setGraph(g);
      input.value = JSON.stringify(g);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [input],
  );

  const { items, rest, count } = summarize(graph);
  const isEmpty = count === 0;

  return (
    <>
      <div className="jdm-preview">
        <div className="jdm-preview__head">
          <span className="jdm-preview__badge">
            {count} {plural(count, "check", "checks")}
          </span>
          <button
            type="button"
            className="jdm-preview__open"
            onClick={() => setOpen(true)}
          >
            {disabled ? "Open (read-only)" : "Open editor"} ⛶
          </button>
        </div>
        {isEmpty ? (
          <div className="jdm-preview__empty">
            No checks yet — click “Open editor” to add.
          </div>
        ) : (
          <ul className="jdm-preview__list">
            {items.map((item, i) => (
              <li key={i} className="jdm-preview__item">
                <span
                  className="jdm-preview__dot"
                  style={{ background: item.color }}
                />
                {item.name}
              </li>
            ))}
            {rest > 0 && (
              <li className="jdm-preview__item jdm-preview__item--more">
                …and {rest} more
              </li>
            )}
          </ul>
        )}
      </div>
      {open && (
        <Overlay
          graph={graph}
          disabled={disabled}
          simulateUrl={simulateUrl}
          onChange={handleChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function mount(el: HTMLElement) {
  if (mounted.has(el)) {
    return;
  }
  const inputId = el.dataset.inputId;
  if (!inputId) {
    console.warn("[django-jdm-editor] [data-jdm-editor] element missing data-input-id");
    return;
  }
  const input = document.getElementById(inputId) as InputEl | null;
  if (!input) {
    console.warn(`[django-jdm-editor] hidden input #${inputId} not found`);
    return;
  }

  const disabled = el.dataset.disabled === "true";
  const simulateUrl = el.dataset.simulateUrl ?? "";
  const initial = parseInitial(input);

  const root = createRoot(el);
  mounted.set(el, root);
  root.render(
    <StrictMode>
      <WidgetApp
        input={input}
        initial={initial}
        disabled={disabled}
        simulateUrl={simulateUrl}
      />
    </StrictMode>,
  );
}

function mountAll(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLElement>("[data-jdm-editor]").forEach(mount);
}

function boot() {
  mountAll();

  // Django admin fires `formset:added` when a new inline row is added.
  document.addEventListener("formset:added", (event) => {
    const target = event.target as HTMLElement | null;
    mountAll(target ?? document);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
