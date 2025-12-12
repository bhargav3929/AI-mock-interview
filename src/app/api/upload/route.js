import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log(`Uploading ${file.name} to Vercel Blob...`);

        // Upload the file to Vercel Blob (public access)
        const blob = await put(file.name, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN, // Ensure this env var is set
            addRandomSuffix: true // Prevent 'blob already exists' error
        });

        console.log("File uploaded successfully:", blob.url);

        // Return the public URL
        return NextResponse.json({
            fileUrl: blob.url,
            fileName: file.name
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
