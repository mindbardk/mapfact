-- De 11 kategorier fra designet. Appen kan ikke køre uden dem.
INSERT INTO "categories" ("slug", "name", "sort") VALUES
	('world', 'World', 1),
	('politics', 'Politics', 2),
	('economy', 'Economy', 3),
	('climate', 'Climate', 4),
	('health', 'Health', 5),
	('crime', 'Crime', 6),
	('science', 'Science', 7),
	('tech', 'Tech', 8),
	('society', 'Society', 9),
	('sport', 'Sport', 10),
	('culture', 'Culture', 11)
ON CONFLICT ("slug") DO NOTHING;
