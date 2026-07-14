import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const resumes = await prisma.resume.findMany({
      orderBy: [{ isActive: "desc" }, { version: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ resumes });
  } catch (error) {
    console.error("GET /api/resume", error);
    return NextResponse.json(
      { error: "Failed to list resumes" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const target = await prisma.resume.findUnique({ where: { id: body.id } });
    if (!target) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.resume.updateMany({ data: { isActive: false } }),
      prisma.resume.update({ where: { id: body.id }, data: { isActive: true } }),
    ]);

    const resume = await prisma.resume.findUnique({ where: { id: body.id } });
    return NextResponse.json({ resume });
  } catch (error) {
    console.error("PATCH /api/resume", error);
    return NextResponse.json(
      { error: "Failed to set active resume" },
      { status: 500 },
    );
  }
}
