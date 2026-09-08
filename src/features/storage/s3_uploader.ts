import type { S3Config } from "./file_config";
import type { IFileUploader } from "./ifileuploader";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";


export class S3_Uploader implements IFileUploader {
    private static instance: S3_Uploader | null = null;

    private config: S3Config;
    public s3Client: S3Client;

    private constructor(config: S3Config) { 
        this.config = config;
        this.s3Client = new S3Client({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKey,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }
    async  putObject(key: string, body: string | Uint8Array, contentType: string="application/octet-stream"): Promise<void> {
        const putCommand=new PutObjectCommand({
            Bucket:this.config.bucket,
            Body:body,
            Key:key,
            ContentType:contentType
        });
         await this.s3Client.send(putCommand);
    }
    async createFolder(folderName: string): Promise<void> {
        const putObjectCommand=new PutObjectCommand({
            Bucket:this.config.bucket,
            Key:`${folderName}`,
            Body:"",
            ContentType:"application/x-directory"
        });
        await this.s3Client.send(putObjectCommand);
    }

    static getInstance(config: S3Config): S3_Uploader {
        if (!S3_Uploader.instance) {
            S3_Uploader.instance = new S3_Uploader(config);
        }
        return S3_Uploader.instance;
    }

    async deleteFile(keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        const command = new DeleteObjectsCommand({
            Bucket: this.config.bucket,
            Delete: {
                Objects: keys.map((key) => ({ Key: key })),
                Quiet: true,
            },
        });
        await this.s3Client.send(command);
    }

    async uploadFile(item: File, k?: string): Promise<void> {
        const arrayBuffer = await item.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const key = k ?? import.meta.env.VITE_S3_BUCKET_KEY;
        const putObject = new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: `${key}${Date.now()}-${item.name}`,
            Body: buffer,
            ContentType: item.type || "application/octet-stream",
        });
        await this.s3Client.send(putObject);
    }

    async uploadFiles(items: FileList): Promise<void> {
        await Promise.all(Array.from(items).map((item) => this.uploadFile(item)));
    }
}

const s3Config: S3Config = {
    region: import.meta.env.VITE_AWS_REGION ?? "us-east-1",
    accessKey: import.meta.env.VITE_AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ?? "",
    bucket: import.meta.env.VITE_S3_BUCKET ?? "my-bucket",
};

export const s3 = S3_Uploader.getInstance(s3Config);