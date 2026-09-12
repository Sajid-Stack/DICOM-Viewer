import { Router, Request, Response } from "express";
import { getInstance } from "../services/orthanc";
import { requireAuth } from "./auth";

const router = Router();


router.get("/:studyUID/:seriesUID/:instanceUID", requireAuth, async (req: Request, res: Response) => {
  const { studyUID, seriesUID, instanceUID } = req.params;
  try {
    const data = await getInstance(studyUID, seriesUID, instanceUID);
    res.setHeader("Content-Type", "application/dicom");
    res.send(Buffer.from(data));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "couldn't fetch image" });
  }
});

export default router;
