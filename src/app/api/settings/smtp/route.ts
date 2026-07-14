import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { SMTP_PRESETS } from "@/lib/constants";
import { resetTransporterCache } from "@/lib/email/sender";
import type { SmtpPresetId } from "@/types";

type SmtpBody = {
  provider?: SmtpPresetId | string;
  email?: string;
  password?: string;
  fromName?: string;
  action?: "test";
  testEmail?: string;
};

function maskSettings(record: {
  id: string;
  provider: string;
  email: string;
  fromName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    provider: record.provider,
    email: record.email,
    fromName: record.fromName,
    isActive: record.isActive,
    hasPassword: true,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function GET() {
  try {
    const settings = await prisma.smtpSettings.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    if (!settings) {
      return NextResponse.json({ settings: null, presets: SMTP_PRESETS });
    }

    return NextResponse.json({
      settings: maskSettings(settings),
      presets: SMTP_PRESETS,
    });
  } catch (error) {
    console.error("GET /api/settings/smtp", error);
    return NextResponse.json(
      { error: "Failed to load SMTP settings" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SmtpBody;
    const provider = (body.provider ?? "gmail") as SmtpPresetId;
    const preset = SMTP_PRESETS[provider] ?? SMTP_PRESETS.gmail;

    if (body.action === "test") {
      const stored = await prisma.smtpSettings.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      const password = body.password ?? (stored ? decrypt(stored.encryptedPass) : undefined);
      const email = body.email ?? stored?.email;
      const testEmail = body.testEmail ?? email;

      if (!email || !password || !testEmail) {
        return NextResponse.json(
          { error: "email, password, and testEmail are required for test" },
          { status: 400 },
        );
      }

      const transporter = nodemailer.createTransport({
        host: preset.host,
        port: preset.port,
        secure: preset.secure,
        auth: { user: email, pass: password },
      });

      await transporter.verify();
      await transporter.sendMail({
        from: body.fromName ? `"${body.fromName}" <${email}>` : email,
        to: testEmail,
        subject: "SMTP test — referral outreach",
        text: "Your SMTP configuration is working.",
      });

      return NextResponse.json({ success: true, tested: testEmail });
    }

    if (!body.email?.trim() || !body.password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    const encryptedPass = encrypt(body.password);

    const settings = await prisma.$transaction(async (tx) => {
      await tx.smtpSettings.updateMany({ data: { isActive: false } });
      return tx.smtpSettings.create({
        data: {
          provider,
          email: body.email!.trim().toLowerCase(),
          encryptedPass,
          fromName: body.fromName?.trim() || "Prem Prasad",
          isActive: true,
        },
      });
    });

    resetTransporterCache();

    return NextResponse.json({ settings: maskSettings(settings) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/settings/smtp", error);
    const message = error instanceof Error ? error.message : "Failed to save SMTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.smtpSettings.updateMany({ data: { isActive: false } });
    resetTransporterCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settings/smtp", error);
    return NextResponse.json(
      { error: "Failed to delete SMTP settings" },
      { status: 500 },
    );
  }
}
