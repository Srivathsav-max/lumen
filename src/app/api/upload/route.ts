import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { success: 0, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // For now, we'll create a data URL from the file
    // In a real implementation, you would upload to a cloud storage service
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    return NextResponse.json({
      success: 1,
      file: {
        url: dataUrl,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: 0, message: "Upload failed" },
      { status: 500 }
    );
  }
}
