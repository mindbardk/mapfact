/** Billeder serveres fra /img/<id>.<ext>. Modulet er klient-sikkert. */
export type ImageExt = 'webp' | 'png';
export type ImageRef = { id: number; ext: ImageExt; width: number; height: number; alt: string };

const IMAGE_FILE = /^([1-9]\d{0,9})\.(webp|png)$/;

export function imageUrl(ref: Pick<ImageRef, 'id' | 'ext'>): string {
	return `/img/${ref.id}.${ref.ext}`;
}

/** Fortolker filnavnet i /img/<id>.<ext>. Alt andet end et positivt id uden foranstillet nul giver null. */
export function parseImageFile(file: string): { id: number; ext: ImageExt } | null {
	const match = IMAGE_FILE.exec(file);
	if (!match) return null;
	return { id: Number(match[1]), ext: match[2] as ImageExt };
}

export function extFromMime(mime: string): ImageExt | null {
	if (mime === 'image/webp') return 'webp';
	if (mime === 'image/png') return 'png';
	return null;
}
