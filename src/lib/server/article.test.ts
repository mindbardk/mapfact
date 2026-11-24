import { describe, expect, test } from 'vitest';
import { readingMinutes, renderArticle } from './article';

describe('faktaboks', () => {
	test(':::factbox Title giver aside med label og indhold', () => {
		const { html } = renderArticle(':::factbox How to read this map\n- One\n- Two\n:::', { mapNo: 1 });
		expect(html).toContain('<aside class="factbox"><p class="factbox-label">How to read this map</p>');
		expect(html).toContain('<li>One</li>');
		expect(html).toMatch(/<\/ul>\s*<\/aside>/);
	});
});

describe('citat', () => {
	test('citat med "— kilde" bliver figure.pullquote med figcaption', () => {
		const { html } = renderArticle('> Maps tell stories.\n>\n> — Jane Doe, Atlas Society', { mapNo: 1 });
		expect(html).toContain('<figure class="pullquote"><blockquote>');
		expect(html).toContain('<p>Maps tell stories.</p>');
		expect(html).toContain('<figcaption>Jane Doe, Atlas Society</figcaption></figure>');
		expect(html).not.toContain('— Jane');
	});

	test('citat uden kilde forbliver blockquote', () => {
		const { html } = renderArticle('> Just a quote.', { mapNo: 1 });
		expect(html).toContain('<blockquote>');
		expect(html).not.toContain('pullquote');
	});
});

describe('figur', () => {
	test('billede med titel alene i et afsnit bliver figur med crop-marks og nummer', () => {
		const { html } = renderArticle('![A map](/img/1.png "The caption")', { mapNo: 412 });
		expect(html).toContain('<figure class="article-figure"><div class="crop-marks">');
		expect(html).toContain('<img src="/img/1.png" alt="A map" loading="lazy" decoding="async">');
		expect(html).toContain(
			'<figcaption><span>The caption</span><span class="figure-no">№ 0412-B</span></figcaption></figure>'
		);
		expect(html).not.toContain('<p><figure');
	});

	test('figurer nummereres B, C', () => {
		const md = '![a](/img/1.png "One")\n\n![b](/img/2.png "Two")';
		const { html } = renderArticle(md, { mapNo: 412 });
		expect(html.indexOf('№ 0412-B')).toBeGreaterThan(-1);
		expect(html.indexOf('№ 0412-B')).toBeLessThan(html.indexOf('№ 0412-C'));
	});

	test('nummereringen starter forfra ved hvert kald', () => {
		renderArticle('![a](/img/1.png "One")', { mapNo: 1 });
		expect(renderArticle('![a](/img/1.png "One")', { mapNo: 1 }).html).toContain('№ 0001-B');
	});

	test('uden kortnummer udelades figure-no', () => {
		const { html } = renderArticle('![a](/img/1.png "One")', { mapNo: null });
		expect(html).toContain('<figure class="article-figure">');
		expect(html).not.toContain('figure-no');
	});

	test('billede uden titel forbliver et almindeligt billede', () => {
		const { html } = renderArticle('![a](/img/1.png)', { mapNo: 1 });
		expect(html).not.toContain('article-figure');
		expect(html).toContain('<img src="/img/1.png" alt="a">');
	});
});

test('# bliver h2, så siden kun har én h1', () => {
	const { html } = renderArticle('# Heading\n\n## Sub', { mapNo: 1 });
	expect(html).not.toContain('<h1');
	expect(html).toContain('<h2>Heading</h2>');
	expect(html).toContain('<h2>Sub</h2>');
});

test('rå HTML escapes', () => {
	const { html } = renderArticle('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>', { mapNo: 1 });
	expect(html).not.toContain('<script');
	expect(html).not.toContain('<img src=x');
	expect(html).toContain('&lt;script&gt;');
});

test('wordCount tæller ord i teksten, ikke i markup', () => {
	expect(renderArticle('Hello **big** world', { mapNo: 1 }).wordCount).toBe(3);
});

test('readingMinutes', () => {
	expect(readingMinutes(0)).toBe(1);
	expect(readingMinutes(690)).toBe(3);
});
