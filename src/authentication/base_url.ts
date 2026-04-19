import axios from "axios";
import { getAuth } from "firebase/auth";

const api = axios.create({
    baseURL: "http://localhost:5000",
});

api.interceptors.request.use(async (config) => {
    const user = getAuth().currentUser;
    console.log(user)
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;