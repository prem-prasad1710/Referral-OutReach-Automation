import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { RESUME_ATTACHMENT_FILENAME } from "@/lib/constants";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "resumes");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const latest = await prisma.resume.findFirst({
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storedName = `resume-v${version}-${Date.now()}-${safeName}`;
    const filePath = path.join(UPLOAD_DIR, storedName);

    await fs.writeFile(filePath, buffer);

    const resume = await prisma.$transaction(async (tx) => {
      await tx.resume.updateMany({ data: { isActive: false } });
      return tx.resume.create({
        data: {
          fileName: RESUME_ATTACHMENT_FILENAME,
          filePath,
          fileSize: buffer.length,
          version,
          isActive: true,
        },
      });
    });

    return NextResponse.json({ resume }, { status: 201 });
  } catch (error) {
    console.error("POST /api/resume/upload", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 },
    );
  }
}
