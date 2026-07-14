import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const templates = await prisma.campaignTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("GET /api/templates", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      subjectTemplate?: string;
      bodyTemplate?: string;
    };

    if (!body.name?.trim() || !body.subjectTemplate?.trim() || !body.bodyTemplate?.trim()) {
      return NextResponse.json(
        { error: "name, subjectTemplate, and bodyTemplate are required" },
        { status: 400 },
      );
    }

    const template = await prisma.campaignTemplate.create({
      data: {
        name: body.name.trim(),
        subjectTemplate: body.subjectTemplate,
        bodyTemplate: body.bodyTemplate,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("POST /api/templates", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param is required" }, { status: 400 });
    }

    await prisma.campaignTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/templates", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
