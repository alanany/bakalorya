import { Request, Response } from "express";

export class UploadController {
  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // req.file contains information about the uploaded file
      // Return the public URL for the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      return res.status(200).json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "Internal server error during upload" });
    }
  }
}
