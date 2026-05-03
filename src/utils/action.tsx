import { useEffect, useRef, useState } from "react";
import type { Action } from "../types";


type ActionMenuWrapperProps = {
    actions: Action[];
    children: React.ReactNode
}
export const ActionMenuWrapper = ({ actions, children }: ActionMenuWrapperProps) => {
    const [open, setOpen] = useState<boolean>(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler)
    })

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 8px', borderRadius: '4px',
                fontSize: '18px', lineHeight: 1, color: '#555',
            }} onClick={(e) => { e.stopPropagation(); setOpen(p => !p) }}>
                {children}

            </div>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%',
                    background: '#fff', border: '1px solid #e0e0e0',
                    borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    zIndex: 100, minWidth: '140px', overflow: 'hidden',
                }}>
                    {actions.map((action) => (
                        <button
                            key={action.label}
                            onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false); }}
                            style={{
                                display: 'block', width: '100%', padding: '8px 16px',
                                background: 'none', border: 'none', textAlign: 'left',
                                cursor: 'pointer', fontSize: '14px',
                                color: action.danger ? '#e53935' : '#222',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = action.danger ? '#fdecea' : '#f5f5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            {action.label}
                        </button>
                    ))}


                </div>
            )}


        </div>
    )

}

export const ActionsMenu = ({ actions }: { actions: Action[] }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '4px 8px', borderRadius: '4px',
                    fontSize: '18px', lineHeight: 1, color: '#555',
                }}
            >
                ⋮
            </button>

            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%',
                    background: '#fff', border: '1px solid #e0e0e0',
                    borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    zIndex: 100, minWidth: '140px', overflow: 'hidden',
                }}>
                    {actions.map((action) => (
                        <button
                            key={action.label}
                            onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false); }}
                            style={{
                                display: 'block', width: '100%', padding: '8px 16px',
                                background: 'none', border: 'none', textAlign: 'left',
                                cursor: 'pointer', fontSize: '14px',
                                color: action.danger ? '#e53935' : '#222',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = action.danger ? '#fdecea' : '#f5f5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};