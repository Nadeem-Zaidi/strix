import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMicrophone, faArrowUp, faStop, faScrewdriverWrench, faUpload } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../state_mngmt/store';
import { changeChatMode } from '../../state_mngmt/slices/chat_mode_slice';
import { Chip } from '../../components/ui/chip';
import "../../global/chat.css";

type ChatInputPrompt = {
    className?: string;
    onSend: (message: string, images: File[]) => void;
    onCancel?: () => void;
    isLoading?: boolean;
};

type ImageEntry = {
    file: File;
    url: string;
};

const ChatInput = ({
    className = "",
    onSend,
    onCancel,
    isLoading = false
}: ChatInputPrompt) => {

    const dispatch = useDispatch();
    const chatMode = useSelector((state: RootState) => state.chatMode.chatMode);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [images, setImages] = useState<ImageEntry[]>([]);
    const navigate = useNavigate();

    // Create stable object URLs alongside files
    const addFiles = (files: File[]) => {
        const newEntries: ImageEntry[] = files.map(file => ({
            file,
            url: URL.createObjectURL(file),
        }));
        setImages(prev => [...prev, ...newEntries]);
    };

    const navigateToFileUploader=()=>{
        navigate('/vector_upload');
    }

    // Revoke URL on remove to free memory
    const removeImage = (index: number) => {
        setImages(prev => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
            // Reset input so same file can be re-selected if removed
            e.target.value = '';
        }
    };

    const handleSend = () => {
        const text = textareaRef.current?.value.trim();

        if ((!text && images.length === 0) || isLoading) return;

        if (!chatMode) {
            dispatch(changeChatMode(true));
        }

        onSend(text || "", images.map(i => i.file));

        // Clear input
        if (textareaRef.current) {
            textareaRef.current.value = '';
            textareaRef.current.style.height = 'auto';
        }

        // Revoke all URLs on send to free memory
        images.forEach(i => URL.revokeObjectURL(i.url));
        setImages([]);
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageFiles = Array.from(e.clipboardData.items)
            .filter(item => item.type.startsWith("image/"))
            .map(item => item.getAsFile())
            .filter((file): file is File => file !== null);

        if (imageFiles.length > 0) {
            e.preventDefault(); // block paste only when there's an image
            addFiles(imageFiles);
        }
        // No images → let default text paste go through naturally
    };

    return (
        <div className={`input_extended ${className}`}>
            <div className="input_container">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />

                {/* ✅ Image Preview INSIDE the container, above the controls row */}
                {images.length > 0 && (
                    <div className="image_preview_container">
                        {images.map(({ url }, index) => (
                            <div key={index} className="image_preview">
                                <img src={url} alt="preview" />
                                <button onClick={() => removeImage(index)}>✕</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className='input_box'>
                    <div className="input_controls_row">
                        <textarea
                            ref={textareaRef}
                            rows={2}
                            placeholder={isLoading ? "Generating response..." : "Ask anything"}
                            onKeyDown={handleKeyDown}
                            onChange={handleInput}
                            disabled={isLoading}
                            onPaste={handlePaste}
                        />


                    </div>
                    <div className='input_tools_buttons'>
                        <button
                            className="icon_btn"
                            disabled={isLoading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FontAwesomeIcon icon={faPlus} />
                        </button>
                        <div className="right_icons">
                            <button className="icon_btn" disabled={isLoading}>
                                <FontAwesomeIcon icon={faMicrophone} />
                            </button>

                            {isLoading ? (
                                <button className="send_btn cancel_btn" onClick={handleCancel} title="Cancel request">
                                    <FontAwesomeIcon icon={faStop} />
                                </button>
                            ) : (
                                <button className="send_btn" onClick={handleSend} title="Send message">
                                    <FontAwesomeIcon icon={faArrowUp}/>
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>
            {!chatMode&&<div className='input_extra'>
                <Chip label='Tools' icon={faScrewdriverWrench} />
                <Chip label='Create Vectors' icon={faUpload} onClick={()=>{navigateToFileUploader()}}/>
             
            </div>}
            
        </div>
    );
};

export default ChatInput;