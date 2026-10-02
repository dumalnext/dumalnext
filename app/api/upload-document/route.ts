import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

const BUCKET_NAME = "student-documents";

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unavailable" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("docType") as string) || "document";
    const identifier = (formData.get("identifier") as string) || "applicant";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload" },
        { status: 400 }
      );
    }

    // Auto-ensure bucket exists if service role is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
      } catch {}
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize extension and filename
    const originalExt = file.name.includes(".")
      ? file.name.split(".").pop()?.toLowerCase()
      : "jpg";
    const cleanExt = originalExt && ["jpg", "jpeg", "png", "webp", "pdf"].includes(originalExt)
      ? originalExt
      : "jpg";

    const cleanId = identifier.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanDoc = docType.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const storagePath = `${cleanId}/${cleanDoc}_${timestamp}.${cleanExt}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type || (cleanExt === "pdf" ? "application/pdf" : "image/jpeg"),
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 400 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
      sizeKb: Math.round(buffer.length / 1024),
      fileName: file.name,
    });
  } catch (err: any) {
    console.error("Upload document API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
