import { expect, test } from 'vitest';
import { formatMapNo } from './map-no';

test.each([
	[412, undefined, '№ 0412'],
	[412, 'B', '№ 0412-B'],
	[12345, undefined, '№ 12345'],
	[1, undefined, '№ 0001']
])('formatMapNo(%s, %s)', (no, suffix, expected) => {
	expect(formatMapNo(no, suffix)).toBe(expected);
});
