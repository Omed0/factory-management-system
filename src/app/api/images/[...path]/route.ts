import { join } from "path";
import { stat, readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
    const path = (await params).path;

    if (!path || path.some(segment => segment.includes('..'))) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const relativePath = path.join('/');
    const filePath = join(process.cwd(), "public", relativePath);

    try {
        // Check if file exists
        const fileStats = await stat(filePath);

        // Get ETag and Last-Modified headers
        const lastModified = fileStats.mtime.toUTCString();
        const eTag = `"${fileStats.size}-${lastModified}"`;

        // Handle caching
        const ifNoneMatch = req.headers.get("if-none-match");
        const ifModifiedSince = req.headers.get("if-modified-since");

        if (ifNoneMatch === eTag || ifModifiedSince === lastModified) {
            return new NextResponse(null, { status: 304 });
        }

        // Read and serve the file
        const fileData = await readFile(filePath);
        const contentType = "image/" + filePath.split(".").pop(); // Basic MIME type detection

        const headers = {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Last-Modified": lastModified,
            ETag: eTag,
        };

        return new NextResponse(fileData, { status: 200, headers });
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        console.error("Error reading file:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
