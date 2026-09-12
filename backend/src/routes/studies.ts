import { Router, Request, Response } from "express";
import { getStudies, getSeries } from "../services/orthanc";
import { prisma } from "../db";
import { requireAuth } from "./auth";

const router = Router();

function tag(dicomJson: any, id: string, fallback: string | number = "") {
  const val = dicomJson?.[id]?.Value?.[0];
  if (val?.Alphabetic) return val.Alphabetic; 
  return val ?? fallback;
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = await getStudies(req.query as Record<string, string>);

    const studies = raw.map((s: any) => ({
      studyUID: tag(s, "0020000D"),
      patientName: tag(s, "00100010", "Unknown"),
      patientId: tag(s, "00100020", "Unknown"),
      date: tag(s, "00080020"),
      modality: tag(s, "00080061"),
      description: tag(s, "00081030"),
      seriesCount: Number(tag(s, "00201206", 0)),
    }));


    res.json(studies);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "couldn't reach orthanc" });
  }
});

router.get("/:studyUID/series", requireAuth, async (req: Request, res: Response) => {
  const { studyUID } = req.params;
  try {
    const series = await getSeries(studyUID);

    await prisma.auditLog.create({
      data: { userId: (req as any).userId, action: "view_study", studyUID },
    });

    res.json(series);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "couldn't load series" });
  }
});

export default router;
