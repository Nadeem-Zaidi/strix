
import { S3_Uploader } from "../../s3_uploader/s3_uploader";
import type { FileConfig, S3Config } from "./file_config";


 type StorageProvider="local"|"s3"|"firebase";
 

export class FileUploaderFactory{
    static create(provider:StorageProvider,config:FileConfig){
        switch(provider){
            case "s3":
                return new S3_Uploader(config as S3Config)
            default:
                throw new Error(`Unknown storage provider: ${provider}`);
        }

    }

}