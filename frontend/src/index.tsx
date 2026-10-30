import { StrictMode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { DecisionGraph, JdmConfigProvider } from "@gorules/jdm-editor";
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

function Overlay({
  graph,
  disabled,
  onChange,
  onClose,
}: {
  graph: DecisionGraphType;
  disabled: boolean;
  onChange: (g: DecisionGraphType) => void;
  onClose: () => void;
}) {
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
    <div className="jdm-overlay" role="dialog" aria-modal="true">
      <div className="jdm-overlay__bar">
        <span className="jdm-overlay__title">
          Decision editor{disabled ? " (read-only)" : ""}
        </span>
        <button type="button" className="jdm-overlay__done" onClick={onClose}>
          Done ✓
        </button>
      </div>
      <div className="jdm-overlay__canvas">
        <JdmConfigProvider>
          <DecisionGraph
            value={graph as never}
            onChange={(g) => onChange(g as DecisionGraphType)}
            disabled={disabled}
          />
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

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** Short, informative graph summary for the collapsed panel. */
function summarize(graph: DecisionGraphType): {
  names: string[];
  rest: number;
  counts: string;
} {
  const nodes = Array.isArray(graph.nodes) ? (graph.nodes as Record<string, unknown>[]) : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  const allNames = nodes.map((n) => {
    const name = typeof n?.name === "string" ? n.name.trim() : "";
    if (name) return name;
    const type = typeof n?.type === "string" ? n.type : "";
    return NODE_TYPE_LABELS[type] ?? type ?? "node";
  });

  const names = allNames.slice(0, 6);
  const rest = allNames.length - names.length;

  const counts =
    `${nodes.length} ${plural(nodes.length, "node", "nodes")}` +
    `, ${edges.length} ${plural(edges.length, "edge", "edges")}`;

  return { names, rest, counts };
}

function WidgetApp({
  input,
  initial,
  disabled,
}: {
  input: InputEl;
  initial: DecisionGraphType;
  disabled: boolean;
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

  const nodeCount = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  const isEmpty = nodeCount === 0;
  const { names, rest, counts } = summarize(graph);

  return (
    <>
      <div className="jdm-preview">
        <span className="jdm-preview__status">
          {isEmpty ? (
            <em>Decision graph is empty — click to create</em>
          ) : (
            <>
              <ol className="jdm-preview__names">
                {names.map((name, i) => (
                  <li key={i} className="jdm-preview__name">
                    {name}
                  </li>
                ))}
                {rest > 0 && (
                  <li className="jdm-preview__name jdm-preview__name--more">
                    …and {rest} more
                  </li>
                )}
              </ol>
              <span className="jdm-preview__counts">{counts}</span>
            </>
          )}
        </span>
        <button
          type="button"
          className="jdm-preview__open"
          onClick={() => setOpen(true)}
        >
          {disabled ? "Open (read-only)" : "Open editor"} ⛶
        </button>
      </div>
      {open && (
        <Overlay
          graph={graph}
          disabled={disabled}
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
  const initial = parseInitial(input);

  const root = createRoot(el);
  mounted.set(el, root);
  root.render(
    <StrictMode>
      <WidgetApp input={input} initial={initial} disabled={disabled} />
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
