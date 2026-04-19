
export interface IFileUploader{
    uploadFile(item: File,key?:string):Promise<void>;
    uploadFiles(items: FileList):Promise<void>;
    deleteFile(keys:string[]):Promise<void>;
    createFolder(folderName: string): Promise<void>
    putObject(key: string,body: string | Uint8Array,contentType: string): Promise<void>
}