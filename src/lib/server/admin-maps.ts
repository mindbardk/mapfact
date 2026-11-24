import { desc, eq } from 'drizzle-orm';
import type { Db } from './db';
import { categories, maps, type MapStatus } from './db/schema';

export type AdminMapRow = {
	id: number;
	no: number | null;
	slug: string;
	title: string;
	status: MapStatus;
	category: string;
	updatedAt: Date;
};

/** Alle kort til admin-listen, inkl. kladder, senest ændrede først. */
export async function listAdminMaps(db: Db): Promise<AdminMapRow[]> {
	return db
		.select({
			id: maps.id,
			no: maps.no,
			slug: maps.slug,
			title: maps.title,
			status: maps.status,
			category: categories.name,
			updatedAt: maps.updatedAt
		})
		.from(maps)
		.innerJoin(categories, eq(maps.categoryId, categories.id))
		.orderBy(desc(maps.updatedAt));
}
