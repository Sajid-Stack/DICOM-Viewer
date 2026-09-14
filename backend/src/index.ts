import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import authRoutes from "./routes/auth";
import studiesRoutes from "./routes/studies";
import wadoRoutes from "./routes/wado";

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const ORTHANC_URL = process.env.ORTHANC_URL || "http://localhost:8042";


app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);


app.use(
  "/dicom-web",
  cors({ origin: true }),
  createProxyMiddleware({
    target: ORTHANC_URL,
    changeOrigin: true,

    pathRewrite: (path) => `/dicom-web${path}`,
  }),
);

app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/studies", studiesRoutes);
app.use("/wado", wadoRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () =>
  console.log(`backend running on http://localhost:${PORT}`),
);