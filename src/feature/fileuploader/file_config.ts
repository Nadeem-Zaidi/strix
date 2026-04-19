
export type S3Config={
    region:string,
    accessKey:string,
    secretAccessKey:string,
    bucket:string
}

export type LocalConfig={
    directory:string
}

export type FileConfig=S3Config|LocalConfig