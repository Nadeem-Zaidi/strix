import { Timestamp } from "firebase/firestore";
import type { Mappable } from "../../types";

export class User implements Mappable {
    id: string;
    phone: string;
    name: string;
    email: string;
    uid: string;
    createdAt: Timestamp;
    folder:string;

    constructor(id: string, phone: string, name: string, email: string, folder:string,uid: string, createdAt?: Timestamp) {
        this.id = id;
        this.phone = phone;
        this.name = name;
        this.email = email;
        this.uid = uid;
        this.folder=folder,
        this.createdAt = createdAt ?? Timestamp.now();
        
    }

    static fromMap(map: Record<string, any>): User {
        return new User(
            map["id"],
            map["phone"],
            map["name"],
            map["email"],
            map["uid"],
            map["folder"],
            map["createdAt"] instanceof Timestamp
                ? map["createdAt"]
                : Timestamp.now()
        );
    }

    toMap(): Record<string, any> {
        return {
            id: this.id,
            phone: this.phone,
            name: this.name,
            email: this.email,
            uid: this.uid,
            folder:this.folder,
            createdAt: this.createdAt,
        };
    }
}