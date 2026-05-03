import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type ModelProps={
    children:ReactNode;
}

export const Modal=({children}:ModelProps)=>{
    const modelRoot=document.getElementById("modal-root")
    if(!modelRoot) return;
    return createPortal(children,modelRoot)

}

