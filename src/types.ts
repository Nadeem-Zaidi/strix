import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type S3FILE = {
  type: string;
  name: string;
  prefix: string;
  lastModified: string;
  size?: number;
  url?:string;
};

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

export type Session = {
  id: string;
  title: string;
  last_message: string | null;
  updated_at: string;
};
export type BotMessageProps = {
  text: string;
  isStreaming?: boolean;
  cancelled?: boolean;
};


export type Folder={
  type:string;
  name:string;
  path:string;
}

export type FilesList={
  type:string,
  name:string,
  prefix:string,
  key:string,
  size:number,
  lastModified:string,
  url:string
}

export type FilesResult={
  files:Folder[] | FilesList[],
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

