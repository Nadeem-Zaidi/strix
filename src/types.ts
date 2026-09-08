import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type BreadCrumb={name:string,prefix:string};

export  type CustomIconProps={
  icon:IconDefinition
  onClick?:(e:any)=>void

}

export type FileStatus = "idle" | "uploading" | "done" | "error";

export type FileItem ={
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

export const EXT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  md: { color: "#3B82F6", bg: "#EFF6FF", label: "MD" },
  pdf: { color: "#EF4444", bg: "#FEF2F2", label: "PDF" },
  txt: { color: "#6B7280", bg: "#F9FAFB", label: "TXT" },
  js: { color: "#F59E0B", bg: "#FFFBEB", label: "JS" },
  ts: { color: "#3B82F6", bg: "#EFF6FF", label: "TS" },
  json: { color: "#10B981", bg: "#ECFDF5", label: "JSON" },
  png: { color: "#8B5CF6", bg: "#F5F3FF", label: "PNG" },
  jpg: { color: "#EC4899", bg: "#FDF2F8", label: "JPG" },
  zip: { color: "#6B7280", bg: "#F3F4F6", label: "ZIP" },
};

export const getExt = (name: string) => name.split(".").pop()?.toLowerCase() || "";

export interface IDatabase<T>{
  getOne(id:string):Promise<T>;
  getAll():Promise<T[]>;
  createOne(e:T):Promise<T|void>;
  createMany(e:T[]):Promise<void>;
  getByField(field: string, value: any): Promise<T[]>
  deleteOne(id: string): Promise<void>
}

export interface Mappable {
    toMap(): Record<string, any>;
}

export type Message = {
  role: "user" | "bot";
  text: string;
  cancelled?: boolean;
};

export type Session={
  id:string
  userid:string
  title:string
  model?:string|null
  created_at:string
  updated_at:string

}
export type BotMessageProps = {
  text: string;
  isStreaming?: boolean;
  cancelled?: boolean;
};


export type S3Folder={
  type:string;
  name:string;
  path:string;
}

export type  S3File={
  type:string,
  name:string,
  prefix:string,
  key:string,
  size:number,
  lastModified:string,
  url:string
}

export type S3FileType=S3Folder | S3File

export type FilesResult={
  files:S3Folder[] | S3File[],
  nextToken:string | undefined |null
}

type FolderItem = { type: "folder"; name: string; path: string };
export type FileListItem = {
  type: "file";
  name: string;
  prefix: string;
  key: string;
  size: number;
  lastModified: string;
};
type ListItem = FolderItem | FileItem;

export type SortField = "name" | "size" | "modified";
export type SortDir = "asc" | "desc";
export type ViewMode = "list" | "grid";
export type ContextMenuState = { x: number; y: number; item: ListItem } | null;

export type ExtMeta = { color: string; bg: string; label: string };

export type Action = { label: string; onClick: () => void; danger?: boolean };
export type TextContent = {
    type: string;
    text: string;
};

export type ToolCall = {
    type: string,
    id: string,
    name: string,
    arguments: Record<string, any>
}

export type ImageUrlContent = {
    type: string;
    image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
    };
};

export type ImageId = {
    type: string,
    file_id: string,
    image_url?: string

}

export type FileInput = {
    type: string,
    file_id: string,
    fileName?: string,
    fileExtension?: string,
    fileUrl?: string
}

export type Tool = {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>
    }

}

export type ImageBase64Content = {
    type: string;
    source: {
        type: 'base64';
        media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        data: string;
    };
};

export type ContentPart = TextContent | ImageUrlContent | ImageBase64Content | ImageId | ToolCall;

export type LLMConfig = {
    model: string;
    apiKey?: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
}

export type LLMMessageToolCall = {
    type: string;
    id: string;
    name: string;
    call_id: string;
    arguments: Record<string, any>
    output: any
}
export type LLMMessage = {
    id?: string,
    role?: 'system' | 'user' | 'assistant' | 'tool' | 'tool_call' | 'tool_call_output';
    content?: string | ContentPart[];
    name?: string;
    arguments?: Record<string, any>;
    tool_call_id?: string;
    output?: any;
    type?: string;
    isDone?:boolean
    error?:string
    cancelled?:boolean
    source_file?:string[]
}

export type ImageAttachment= {
  previewUrl: string;
  mimeType: string;
  data: string;
}

export type TextAttachment= {
  name: string;
  content: string;
}

export type FileAttachment = {
  name: string;
  extension: string;
  file: File;       // the actual blob, used for upload
  isImage: boolean;
};


export type LLMFileUploadResponse={
    name:string,
    extension:string,
    isImage:boolean,
    fileId:string,
    url:string

}
