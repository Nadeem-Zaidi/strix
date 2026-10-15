import { Maximize2, Minimize2, PanelRightClose, PanelRightOpen } from "lucide-react";

// Top-right of a canvas: hide/show the side panel, enter/leave focus mode.
export const CanvasViewbar = ({ focus, onFocus, panel, onPanel }: { focus: boolean; onFocus: () => void; panel: boolean; onPanel: () => void }) => (
  <div className="wf_viewbar" role="toolbar" aria-label="Canvas view">
    <button type="button" className="wf_viewbtn" onClick={onPanel} aria-pressed={!panel}
      title={panel ? "Hide the side panel" : "Show the side panel"} aria-label={panel ? "Hide the side panel" : "Show the side panel"}>
      {panel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
    </button>
    <button type="button" className="wf_viewbtn" onClick={onFocus} aria-pressed={focus}
      title={focus ? "Exit full screen (Esc)" : "Full screen"} aria-label={focus ? "Exit full screen" : "Full screen"}>
      {focus ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
    </button>
  </div>
);
