import { useState } from 'react';
import '../../../global/loader/circle_square.css';
import { TestModal } from '../portal/test_model';

type RagLoaderProps = {
    size?: number;
    text:string;
};


export const RagLoader = ({size,text}:RagLoaderProps) => {
    const [open, setOpen] = useState(true);
    return (
        <TestModal open={open} onClose={() => setOpen(false)}>
            <div className='rag_loader_main'>
            <div
                className="loader"
                style={{ width: size, height: size }}
            />
            <div>
                <h4>{text}</h4>
            </div> 
        </div>
        </TestModal>
    );
};