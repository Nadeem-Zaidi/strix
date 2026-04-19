import type { IDatabase, Mappable } from "../types";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    query,
    where,
    Firestore,
    addDoc,
} from "firebase/firestore";


export class Firebase_Storage<T extends Mappable> implements IDatabase<T> {
    collectionName: string;
    db: Firestore;
    fromMap: (data: Record<string, any>) => T;

    constructor(db: Firestore, collectionName: string, fromMap: (data: Record<string, any>) => T) {
        this.collectionName = collectionName;
        this.db = db;
        this.fromMap = fromMap;
    }
    async getByField(field: string, value: any): Promise<T[]> {
        const q = query(collection(this.db, this.collectionName), where(field, "==", value));
        const snapShot = await getDocs(q);
        return snapShot.docs.map((item) => this.fromMap({ id: item.id, ...item.data() }));
    }
    async getOne(id: string): Promise<T> {
        const snapShot = await getDoc(doc(this.db, this.collectionName, id));
        if (!snapShot.exists) throw new Error(`${id} not found`);
        return this.fromMap({ id: snapShot.id, ...snapShot.data() });


    }
    getAll(): Promise<T[]> {
        throw new Error("Method not implemented.");
    }
    async createOne(e: T): Promise<void | T> {
        const ref = await addDoc(collection(this.db, this.collectionName), e.toMap())
        return this.fromMap({ ...e.toMap(), id: ref.id });
    }
    createMany(e: T[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async deleteOne(id: string): Promise<void> {
        const ref = doc(this.db, this.collectionName, id);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) throw new Error(`Document ${id} not found`);
        await deleteDoc(ref);
    }

}