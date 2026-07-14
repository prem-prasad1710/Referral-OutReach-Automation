import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("GET /api/contacts", error);
    return NextResponse.json(
      { error: "Failed to list contacts" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Query parameter id is required" },
        { status: 400 },
      );
    }

    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/contacts", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 },
    );
  }
}
