import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// withCredentials makes the browser send/accept the httpOnly cookie -
// no token to manage on our side, nothing stored in localStorage
export const api = axios.create({ baseURL, withCredentials: true });

export interface Study {
  studyUID: string;
  patientName: string;
  patientId: string;
  date: string;
  modality: string;
  seriesCount: number;
  description: string;
}

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function getStudies(): Promise<Study[]> {
  const res = await api.get("/studies");
  return res.data;
}
