import mime from 'mime';
import { join } from 'path';
import { stat, mkdir, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import _ from 'lodash';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const image = (formData.get('image') as File) || null;

  const buffer = Buffer.from(await image.arrayBuffer());
  const relativeUploadDir = `images/${new Date(Date.now())
    .toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '-')}`;

  const uploadDir = join(process.cwd(), 'public', relativeUploadDir);

  try {
    await stat(uploadDir);
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      // This is for checking the directory is exist (ENOENT : Error No Entry)
      await mkdir(uploadDir, { recursive: true });
    } else {
      return NextResponse.json({ error: 'شتێک هەڵەیە.' }, { status: 500 });
    }
  }

  try {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${image.name
      .replace(/\s+/g, '_')
      .replace(
        /\.[^/.]+$/,
        ''
      )}-${uniqueSuffix}.${mime.getExtension(image.type)}`;
    await writeFile(`${uploadDir}/${filename}`, buffer);
    const filePath = `${relativeUploadDir}/${filename}`;

    return NextResponse.json({ filePath });
  } catch (e: any) {
    console.error('هەڵەیەک ڕوویدا\n', e);
    return NextResponse.json({
      description: e.message,
      message: 'هەڵەیەک ڕوویدا',
      status: e.response.statusCode,
    });
  }
}
