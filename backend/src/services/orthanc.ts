import axios from "axios";


const orthancUrl = process.env.ORTHANC_URL || "http://localhost:8042";

const client = axios.create({
  baseURL: `${orthancUrl}/dicom-web`,
  auth: {
    username: process.env.ORTHANC_USER || "orthanc",
    password: process.env.ORTHANC_PASS || "orthanc",
  },
});

// QIDO-RS - search studies
export async function getStudies(query: Record<string, string> = {}) {
  const res = await client.get("/studies", { params: query });
  return res.data;
}

// QIDO-RS - list series under a study
export async function getSeries(studyUID: string) {
  const res = await client.get(`/studies/${studyUID}/series`);
  return res.data;
}

// WADO-RS - fetch actual image/instance data
export async function getInstance(studyUID: string, seriesUID: string, instanceUID: string) {
  const res = await client.get(
    `/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}`,
    { responseType: "arraybuffer" }
  );
  return res.data;
}
