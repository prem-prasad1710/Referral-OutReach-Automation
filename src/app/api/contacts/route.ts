import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: [{ company: "asc" }, { createdAt: "desc" }],
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
    const company = searchParams.get("company");

    if (!id && !company) {
      return NextResponse.json(
        { error: "Query parameter id or company is required" },
        { status: 400 },
      );
    }

    if (company) {
      const normalized = company.trim().toLowerCase();
      const toDelete = await prisma.contact.findMany();
      const ids = toDelete
        .filter((c) => c.company.trim().toLowerCase() === normalized)
        .map((c) => c.id);

      if (ids.length === 0) {
        return NextResponse.json(
          { error: "No contacts found for this company" },
          { status: 404 },
        );
      }

      await prisma.$transaction([
        prisma.campaignRecipient.deleteMany({
          where: { contactId: { in: ids } },
        }),
        prisma.contact.deleteMany({ where: { id: { in: ids } } }),
      ]);

      return NextResponse.json({ success: true, deleted: ids.length, company });
    }

    await prisma.$transaction([
      prisma.campaignRecipient.deleteMany({ where: { contactId: id! } }),
      prisma.contact.delete({ where: { id: id! } }),
    ]);

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/contacts", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "Contact is linked to a campaign and could not be deleted. Try again after refreshing.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 },
    );
  }
}
