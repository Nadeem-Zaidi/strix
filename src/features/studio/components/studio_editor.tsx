import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, MiniMap, ReactFlow,
  type Connection, type Edge, type EdgeChange, type NodeChange,
} from "@xyflow/react";
import { ArrowLeft, Bell, Bot, Check, Flag, GitFork, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { Button, ErrorNote } from "@/shared/ui/ui";
import type { KnowledgeDocument } from "@/shared/types";
import { api } from "@/features/chat/api/chat_api";
import { agentsApi } from "@/features/agents/api/agents_api";
import type { AgentCatalog } from "@/features/agents/types";
import { skillsApi, type SkillSummary } from "@/features/skills/api/skills_api";
import { pipelinesApi, type FlowNode, type FlowTraceEntry, type PipelineRun } from "@/features/pipelines/api/pipelines_api";
import { branchLabel, isTrace } from "@/features/pipelines/lib/flow_graph";
import { FlowRunPanel } from "@/features/pipelines/components/flow_run_panel";
import { CanvasViewbar } from "@/features/pipelines/components/canvas_viewbar";
import { useCanvasLayout } from "@/features/pipelines/lib/use_canvas_layout";
import { studioApi, type Port, type StudioCanvas, type StudioNode, type StudioNodeType, type StudioProject } from "@/features/studio/api/studio_api";
import {
  isSub, newStudioNode, PORT_SUB, SUB_PORT, subsOf, toCanvas, toEdge, toGraph, traceByNode, uniqueAgentName, upstream, type CanvasNode,
} from "@/features/studio/lib/studio_graph";
import { blankCanvas, TEMPLATES } from "@/features/studio/lib/studio_templates";
import { AgentNode, StepNodeCard, SubNodeCard, TriggerNode } from "@/features/studio/components/studio_nodes";
import { StudioInspector } from "@/features/studio/components/studio_inspector";

const nodeTypes = { trigger: TriggerNode, agent: AgentNode, sub: SubNodeCard, step: StepNodeCard };
const errorText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const kindOf = (n: StudioNode) => (n.type === "trigger" ? "trigger" : n.type === "agent" ? "agent" : isSub(n) ? "sub" : "step");

const ADD: { type: StudioNodeType; label: string; icon: React.ReactNode }[] = [
  { type: "agent", label: "Agent", icon: <Bot size={15} /> },
  { type: "condition", label: "Condition", icon: <GitFork size={15} /> },
  { type: "router", label: "Router", icon: <RouteIcon size={15} /> },
  { type: "approval", label: "Approval", icon: <ShieldCheck size={15} /> },
  { type: "notify", label: "Notify", icon: <Bell size={15} /> },
  { type: "end", label: "End", icon: <Flag size={15} /> },
];

// Agent Studio editor: an n8n-style canvas, left → right. Agents take a
// model, tools, knowledge and skills on their bottom ports; flow steps
// (conditions, routers, approvals) are the Workflows ones. Saving creates
// or updates real agents; Run shows each node's status live.
export const StudioEditor = () => {
  const { id: routeId } = useParams();
  const [search] = useSearchParams();
  const isNew = !routeId;
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<AgentCatalog | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deliver, setDeliver] = useState(false);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [saved, setSaved] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [active, setActive] = useState<PipelineRun | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [starting, setStarting] = useState(false);
  const [rotating, setRotating] = useState(false);
  // The canvas mounts once the project is loaded, so its initial fitView sees the nodes.
  const [ready, setReady] = useState(false);
  const layout = useCanvasLayout("owl.studio");
  const { openPanel } = layout;

  const snapshot = (n: string, d: string, dl: boolean, c: StudioCanvas) => JSON.stringify({ n, d, dl, c });

  const showProject = useCallback((p: StudioProject) => {
    const g = toGraph(p.canvas);
    setProject(p);
    setName(p.name);
    setDescription(p.description);
    setDeliver(p.deliver_result);
    setNodes(g.nodes);
    setEdges(g.edges);
    setSaved(snapshot(p.name, p.description, p.deliver_result, toCanvas(g.nodes, g.edges)));
    setRuns(p.runs);
    setActive((a) => (a ? p.runs.find((r) => r.id === a.id) ?? a : p.runs[0] ?? null));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [cat, docs, sk] = await Promise.all([
          agentsApi.catalog(),
          api.getDocuments().catch(() => [] as KnowledgeDocument[]),
          skillsApi.list().catch(() => [] as SkillSummary[]),
        ]);
        setCatalog(cat);
        setDocuments(docs ?? []);
        setSkills(sk ?? []);
        if (isNew) {
          const template = TEMPLATES.find((t) => t.id === search.get("template"));
          const g = toGraph(template ? template.build() : blankCanvas());
          setNodes(g.nodes);
          setEdges(g.edges);
          setName(template?.name ?? "");
          setDeliver(template?.deliver_result ?? false);
          setReady(true);
          return;
        }
        showProject(await studioApi.getProject(routeId!));
        setReady(true);
      } catch (e) {
        setLoadError(errorText(e, "Couldn't load the project"));
      }
    })();
  }, [isNew, routeId, search, showProject]);

  // Follow the active run (quickly while running, slowly while it waits for an approval).
  const activeId = active?.id;
  const activeStatus = active?.status;
  useEffect(() => {
    if (!activeId || (activeStatus !== "running" && activeStatus !== "waiting")) return;
    const t = setInterval(async () => {
      try {
        const r = await pipelinesApi.getRun(activeId);
        setActive(r);
        setRuns((list) => list.map((x) => (x.id === r.id ? r : x)));
      } catch {
        // keep polling
      }
    }, activeStatus === "running" ? 1500 : 4000);
    return () => clearInterval(t);
  }, [activeId, activeStatus]);

  const trace = useMemo(() => traceByNode(active && isTrace(active.steps) ? (active.steps as unknown as FlowTraceEntry[]) : undefined), [active]);
  const plainNodes = useMemo(() => nodes.map((n) => n.data.node), [nodes]);

  // Adds a model / tool / knowledge / skill under an agent and plugs it in.
  const addSub = useCallback((agentId: string, port: Port) => {
    const agent = nodes.find((n) => n.id === agentId);
    if (!agent) return;
    const plugged = subsOf(agentId, nodes.map((n) => n.data.node), edges);
    if (port === "model" && plugged.some((s) => s.type === "model")) return;
    const usedTools = new Set(plugged.flatMap((s) => (s.type === "tool" ? [s.tool] : [])));
    const position = { x: agent.position.x - 30 + plugged.length * 88, y: agent.position.y + 190 };
    const node = newStudioNode(PORT_SUB[port], position, {
      provider: catalog?.defaultProvider,
      tool: catalog?.builtinTools.find((t) => !usedTools.has(t.id))?.id,
    });
    setNodes((ns) => [...ns, { id: node.id, type: "sub", position, data: { node }, deletable: true }]);
    setEdges((es) => [...es, toEdge({ id: `${node.id}-${agentId}`, from: node.id, to: agentId, port })]);
    setSelectedId(node.id);
    openPanel();
  }, [nodes, edges, catalog, openPanel]);

  const labels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of catalog?.builtinTools ?? []) m[`tool:${t.id}`] = t.label;
    for (const p of catalog?.providers ?? []) m[`provider:${p.id}`] = p.label;
    for (const s of skills) m[`skill:${s.id}`] = s.name;
    return m;
  }, [catalog, skills]);

  const shown = useMemo(() => nodes.map((n) => {
    const node = n.data.node;
    const data = { ...n.data, status: trace.get(n.id)?.status };
    if (node.type === "agent") Object.assign(data, { subs: subsOf(n.id, plainNodes, edges), onAdd: (port: Port) => addSub(n.id, port) });
    if (isSub(node)) data.labels = labels;
    return { ...n, selected: n.id === selectedId, data };
  }), [nodes, plainNodes, edges, trace, selectedId, addSub, labels]);

  const shownEdges = useMemo(() => {
    const byId = new Map(plainNodes.map((n) => [n.id, n]));
    return edges.map((e) => (e.targetHandle && e.targetHandle !== "in" ? e : { ...e, label: branchLabel(e.sourceHandle, byId.get(e.source) as FlowNode | undefined) }));
  }, [edges, plainNodes]);

  const canvas = useMemo(() => toCanvas(nodes, edges), [nodes, edges]);
  const dirty = snapshot(name, description, deliver, canvas) !== saved;
  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const removeNodes = (ids: Set<string>) => {
    // An agent takes its plugged-in sub-nodes with it.
    for (const e of edges) if (ids.has(e.target) && e.targetHandle && e.targetHandle !== "in") ids.add(e.source);
    setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
    setEdges((es) => es.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
    if (selectedId && ids.has(selectedId)) setSelectedId(null);
  };

  const onNodesChange = useCallback((changes: NodeChange<CanvasNode>[]) => {
    const removed = new Set(changes.flatMap((c) => (c.type === "remove" ? [c.id] : [])));
    if (removed.size) {
      // Deleting an agent deletes what's plugged into it.
      for (const e of edges) if (removed.has(e.target) && e.targetHandle && e.targetHandle !== "in") removed.add(e.source);
      setEdges((es) => es.filter((e) => !removed.has(e.source) && !removed.has(e.target)));
      setNodes((ns) => applyNodeChanges(changes, ns).filter((n) => !removed.has(n.id)));
      if (selectedId && removed.has(selectedId)) setSelectedId(null);
      return;
    }
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, [edges, selectedId]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)), []);

  const isValidConnection = useCallback((c: Connection | Edge) => {
    if (c.source === c.target) return false;
    const src = nodes.find((n) => n.id === c.source)?.data.node;
    const dst = nodes.find((n) => n.id === c.target)?.data.node;
    if (!src || !dst) return false;
    const port = c.targetHandle && c.targetHandle !== "in" ? (c.targetHandle as Port) : null;
    if (port) {
      // Sub-nodes go into the matching port; one model per agent.
      if (!isSub(src) || dst.type !== "agent" || SUB_PORT[src.type] !== port) return false;
      if (port === "model") return !edges.some((e) => e.target === dst.id && e.targetHandle === "model" && e.source !== src.id);
      return true;
    }
    return !isSub(src) && !isSub(dst) && dst.type !== "trigger";
  }, [nodes, edges]);

  const onConnect = useCallback((c: Connection) => {
    const port = c.targetHandle && c.targetHandle !== "in" ? (c.targetHandle as Port) : null;
    setEdges((es) => {
      if (port) {
        // A sub-node plugs into one agent: re-plugging moves it.
        return addEdge(toEdge({ id: `${c.source}-${c.target}`, from: c.source, to: c.target, port }), es.filter((e) => e.source !== c.source));
      }
      // One connection per output: a new one replaces the old.
      const branch = (c.sourceHandle ?? undefined) as never;
      return addEdge(
        toEdge({ id: `${c.source}-${c.sourceHandle ?? "out"}-${c.target}`, from: c.source, to: c.target, branch }),
        es.filter((e) => !(e.source === c.source && (e.sourceHandle ?? null) === (c.sourceHandle ?? null) && (!e.targetHandle || e.targetHandle === "in"))),
      );
    });
  }, []);

  const addStep = (type: StudioNodeType) => {
    const main = nodes.filter((n) => !isSub(n.data.node));
    const anchor = selected && !isSub(selected.data.node) ? selected : main.reduce<CanvasNode | null>((r, n) => (!r || n.position.x > r.position.x ? n : r), null);
    const position = anchor ? { x: anchor.position.x + 300, y: anchor.position.y + (selected ? 0 : 40) } : { x: 0, y: 0 };
    let node = newStudioNode(type, position);
    if (node.type === "agent") node = { ...node, agent: { ...node.agent, name: uniqueAgentName(plainNodes) } };
    setNodes((ns) => [...ns, { id: node.id, type: kindOf(node), position, data: { node }, deletable: true }]);
    setSelectedId(node.id);
    openPanel();
  };

  const updateNode = (node: StudioNode) => {
    setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, node } } : n)));
    if (node.type === "router") {
      const live = new Set(node.routes.map((r) => `route:${r.id}`));
      setEdges((es) => es.filter((e) => e.source !== node.id || !e.sourceHandle?.startsWith("route:") || live.has(e.sourceHandle)));
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const input = { name, description, deliver_result: deliver, canvas };
      if (isNew) {
        const created = await studioApi.create(input);
        setSelectedId(null);      // show the Run panel: running is the next step
        navigate(`/studio/${created.id}`, { replace: true });
        return;
      }
      showProject(await studioApi.update(routeId!, input));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      setError(errorText(e, "Couldn't save"));
    } finally {
      setSaving(false);
    }
  };

  const run = async (input: string) => {
    if (!routeId) return;
    setStarting(true);
    setError(null);
    try {
      const r = await studioApi.run(routeId, input);
      setActive(r);
      setRuns((list) => [r, ...list]);
      setSelectedId(null);
    } catch (e) {
      setError(errorText(e, "Couldn't start the run"));
    } finally {
      setStarting(false);
    }
  };

  const refreshActive = async () => {
    if (!active) return;
    const r = await pipelinesApi.getRun(active.id);
    setActive(r);
    setRuns((list) => list.map((x) => (x.id === r.id ? r : x)));
  };

  const rotateWebhook = async () => {
    if (!routeId) return;
    setRotating(true);
    try {
      const p = await studioApi.rotateWebhook(routeId);
      setProject(p);
    } catch (e) {
      setError(errorText(e, "Couldn't create a new URL"));
    } finally {
      setRotating(false);
    }
  };

  if (loadError) {
    return (
      <div className="ag_page">
        <div className="ag_error">{loadError}</div>
        <Button onClick={() => navigate("/studio")}><ArrowLeft size={15} /> Back to Agent Studio</Button>
      </div>
    );
  }

  const blockedReason = isNew ? "Save the project first." : dirty ? "Save your changes first." : undefined;
  const selNode = selected?.data.node ?? null;
  const hostAgent = selNode && isSub(selNode) ? plainNodes.find((n) => edges.some((e) => e.source === selNode.id && e.target === n.id)) ?? null : null;
  const savedTrigger = project ? (project.canvas.nodes.find((n) => n.type === "trigger") as Extract<StudioNode, { type: "trigger" }> | undefined)?.trigger.type ?? null : null;

  return (
    <div className={`ag_page ag_page--editor wf_page as_page ${layout.focus ? "is_focus" : ""}`}>
      <header className="ag_editor_head">
        <button type="button" className="ag_back" onClick={() => navigate("/studio")}><ArrowLeft size={16} /> Agent Studio</button>
        <div className="ag_editor_head__title">
          <h1>{isNew ? "New project" : name || "Untitled project"}</h1>
          {project && <span className="ag_chip">{project.trigger_summary}</span>}
        </div>
      </header>

      <div className="wf_meta">
        <input className="ag_input ag_input--title" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" maxLength={80} />
        <input className="ag_input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does it do? (optional)" maxLength={300} />
      </div>

      <div className={`wf_layout ${layout.panel ? "" : "is_panel_closed"}`}>
        <div className="wf_canvas as_canvas">
          <CanvasViewbar focus={layout.focus} onFocus={layout.toggleFocus} panel={layout.panel} onPanel={layout.togglePanel} />
          <div className="wf_toolbar" role="toolbar" aria-label="Add a node">
            {ADD.map((a) => (
              <button key={a.type} type="button" className={`wf_add wf_add--${a.type}`} onClick={() => addStep(a.type)}>{a.icon} {a.label}</button>
            ))}
          </div>
          {ready && <ReactFlow
            nodes={shown}
            edges={shownEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_e, n) => { setSelectedId(n.id); layout.openPanel(); }}
            onPaneClick={() => setSelectedId(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            minZoom={0.25}
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="as_minimap" />
          </ReactFlow>}
          <div className="as_hint ag_small">Drag from a node's right dot to connect · <strong>+</strong> on an agent adds a model, tool, knowledge or skill</div>
        </div>

        <aside className="wf_side">
          {selected && selNode ? (
            <StudioInspector
              key={selected.id}
              node={selNode}
              before={upstream(selected.id, nodes, edges)}
              subs={subsOf(selected.id, plainNodes, edges)}
              hostAgent={hostAgent}
              runEntry={trace.get(selected.id)}
              ctx={{ catalog, documents, skills, project, savedTrigger, deliver, setDeliver, onRotateWebhook: () => void rotateWebhook(), rotating }}
              onChange={updateNode}
              onDelete={() => removeNodes(new Set([selected.id]))}
              onClose={() => setSelectedId(null)}
              onSelect={setSelectedId}
              onAddSub={(port) => addSub(selected.id, port)}
            />
          ) : (
            <FlowRunPanel
              canRun={!blockedReason && active?.status !== "running"}
              blockedReason={blockedReason}
              starting={starting}
              onRun={(input) => void run(input)}
              save={blockedReason ? {
                label: isNew ? "Create project" : "Save changes",
                onSave: () => void save(),
                busy: saving,
                disabled: !name.trim(),
                hint: !name.trim() ? "Give the project a name, then save it." : isNew ? "Save the project first — this creates its agents." : "Save your changes first.",
              } : undefined}
              active={active}
              runs={runs}
              onPick={setActive}
              onDecide={async (approved, comment) => {
                if (!active) return;
                setError(null);
                try {
                  await pipelinesApi.decide(active.id, approved, comment);
                } catch (e) {
                  setError(errorText(e, "Couldn't record the decision"));
                }
                await refreshActive().catch(() => {});
              }}
              onCancel={async () => {
                if (!active) return;
                await pipelinesApi.cancel(active.id).catch((e) => setError(errorText(e, "Couldn't cancel")));
                await refreshActive().catch(() => {});
              }}
            />
          )}
        </aside>
      </div>

      <div className={`ag_savebar ${dirty || isNew || error ? "is_visible" : ""}`}>
        <ErrorNote message={error} />
        <span className="ag_muted ag_small">{isNew ? "Build the project, then create it — its agents are created too." : justSaved ? "Saved" : dirty ? "You have unsaved changes" : ""}</span>
        <Button variant="primary" onClick={() => void save()} busy={saving} disabled={!name.trim() || (!isNew && !dirty)}>
          {justSaved ? <><Check size={15} /> Saved</> : isNew ? "Create project" : "Save changes"}
        </Button>
      </div>
    </div>
  );
};
