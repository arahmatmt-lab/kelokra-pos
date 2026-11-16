import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, role, accountId } = body;

    if (!username || !role) {
      return NextResponse.json(
        { error: "Username dan role wajib disertakan." },
        { status: 400 }
      );
    }

    const sessionPayload = JSON.stringify({
      username,
      role,
      accountId: accountId || null,
      issuedAt: new Date().toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      username,
      role,
    });

    response.cookies.set("kelokra_session", Buffer.from(sessionPayload).toString("base64"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat sesi login." },
      { status: 500 }
    );
  }
}
