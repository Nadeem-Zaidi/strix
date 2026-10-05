import type { IDatabase, Mappable } from "@/shared/types";
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
    setDoc,
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
    // null when the document doesn't exist.
    async getById(id: string): Promise<T | null> {
        const snapShot = await getDoc(doc(this.db, this.collectionName, id));
        if (!snapShot.exists()) return null;
        return this.fromMap({ id: snapShot.id, ...snapShot.data() });
    }

    // Writes the document under a known id (e.g. the user's uid).
    async setOne(id: string, e: T): Promise<void> {
        await setDoc(doc(this.db, this.collectionName, id), e.toMap());
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
    createMany(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    async deleteOne(id: string): Promise<void> {
        const ref = doc(this.db, this.collectionName, id);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) throw new Error(`Document ${id} not found`);
        await deleteDoc(ref);
    }

}