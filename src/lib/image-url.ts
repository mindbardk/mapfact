/** Billeder serveres fra /img/<id>.<ext>. Modulet er klient-sikkert. */
export type ImageExt = 'webp' | 'png';
export type ImageRef = { id: number; ext: ImageExt; width: number; height: number; alt: string };

const IMAGE_FILE = /^([1-9]\d{0,9})\.(webp|png)$/;
/** images.id er int4: større tal ville give en databasefejl (500) i stedet for 404. */
const MAX_ID = 2_147_483_647;

export function imageUrl(ref: Pick<ImageRef, 'id' | 'ext'>): string {
	return `/img/${ref.id}.${ref.ext}`;
}

/** Fortolker filnavnet i /img/<id>.<ext>. Alt andet end et positivt id uden foranstillet nul giver null. */
export function parseImageFile(file: string): { id: number; ext: ImageExt } | null {
	const match = IMAGE_FILE.exec(file);
	if (!match) return null;
	const id = Number(match[1]);
	if (id > MAX_ID) return null;
	return { id, ext: match[2] as ImageExt };
}

export function extFromMime(mime: string): ImageExt | null {
	if (mime === 'image/webp') return 'webp';
	if (mime === 'image/png') return 'png';
	return null;
}
