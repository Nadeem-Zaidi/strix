import { Modal } from "./modal"
import "../../../global/portal.css";
import { Children, type ReactNode } from "react";

type TestModalProps = {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    withButton?: boolean
}

export const TestModal = ({ open, onClose, children, withButton }: TestModalProps) => {

    if (!open) return null;
    return (
        <Modal>
            <div className="modal_main">
                <div className="modal_box">
                    <div className="modal_content">
                        {children}
                    </div>
                    {withButton && <button
                        onClick={onClose}
                        style={{
                            marginTop: "16px",
                            padding: "8px 16px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            width: "100px"
                        }}
                    >
                        Close
                    </button>}
                </div>

            </div>
        </Modal>
    );
}