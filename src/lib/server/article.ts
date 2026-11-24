import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs';
import type Token from 'markdown-it/lib/token.mjs';
import { formatMapNo } from '$lib/map-no';

/**
 * Artiklen er Markdown med få direktiver til designets byggeklodser:
 * - `:::factbox Titel` … `:::` → faktaboks
 * - et citat, hvis sidste afsnit begynder med "— ", → citat med kilde
 * - et billede med titel alene i et afsnit → figur med beskæringsmærker og
 *   kortnummer med suffiks (B, C, …; selve kortet er A)
 * Rå HTML escapes (html: false), så {@html} på resultatet er sikkert.
 */

type Env = { mapNo: number | null; figureIndex: number };

const md = new MarkdownIt({ html: false, linkify: false, typographer: true });
const escape = md.utils.escapeHtml;

const FACTBOX = /^factbox\s+(.+)$/;
md.use(container, 'factbox', {
	validate: (params: string) => FACTBOX.test(params.trim()),
	render: (tokens: Token[], idx: number) => {
		const token = tokens[idx];
		if (token.nesting === 1) {
			const title = FACTBOX.exec(token.info.trim())![1];
			return `<aside class="factbox"><p class="factbox-label">${escape(title)}</p>\n`;
		}
		return '</aside>\n';
	}
});

/** Kun én H1 pr. side (kortets titel): `#` i artiklen bliver H2. */
md.core.ruler.push('demote_h1', (state: StateCore) => {
	for (const token of state.tokens) {
		if ((token.type === 'heading_open' || token.type === 'heading_close') && token.tag === 'h1') {
			token.tag = 'h2';
		}
	}
});

const SOURCE_PREFIX = '— ';

/** Citat, hvis sidste afsnit er "— kilde": kilden flyttes til en figcaption. */
md.core.ruler.push('pullquote', (state: StateCore) => {
	const tokens = state.tokens;
	for (let close = 0; close < tokens.length; close++) {
		if (tokens[close].type !== 'blockquote_close') continue;
		const [pOpen, inline, pClose] = tokens.slice(close - 3, close);
		if (pOpen?.type !== 'paragraph_open' || pClose?.type !== 'paragraph_close') continue;
		if (!inline.content.startsWith(SOURCE_PREFIX)) continue;
		const open = findOpening(tokens, close, 'blockquote_open');
		if (open < 0 || open === close - 4) continue; // kun kilden, intet citat
		const source = inline.content.slice(SOURCE_PREFIX.length).trim();
		tokens.splice(close - 3, 3);
		close -= 3;
		tokens[open].meta = { pullquote: true };
		tokens[close].meta = { source };
	}
});

function findOpening(tokens: Token[], closeIdx: number, type: string): number {
	const level = tokens[closeIdx].level;
	for (let i = closeIdx - 1; i >= 0; i--) {
		if (tokens[i].type === type && tokens[i].level === level) return i;
	}
	return -1;
}

md.renderer.rules.blockquote_open = (tokens, idx) =>
	tokens[idx].meta?.pullquote ? '<figure class="pullquote"><blockquote>\n' : '<blockquote>\n';
md.renderer.rules.blockquote_close = (tokens, idx) => {
	const source = tokens[idx].meta?.source as string | undefined;
	return source === undefined
		? '</blockquote>\n'
		: `</blockquote><figcaption>${escape(source)}</figcaption></figure>\n`;
};

/** Et afsnit med kun ét billede med titel bliver en nummereret figur. */
md.core.ruler.push('figure', (state: StateCore) => {
	const env = state.env as Env;
	const tokens = state.tokens;
	for (let i = 0; i + 2 < tokens.length; i++) {
		const [pOpen, inline, pClose] = tokens.slice(i, i + 3);
		if (pOpen.type !== 'paragraph_open' || pClose.type !== 'paragraph_close') continue;
		const children = inline.children ?? [];
		if (children.length !== 1 || children[0].type !== 'image') continue;
		const image = children[0];
		const title = image.attrGet('title');
		if (!title) continue;
		const suffix = String.fromCharCode('B'.charCodeAt(0) + env.figureIndex++);
		const no =
			env.mapNo === null ? '' : `<span class="figure-no">${escape(formatMapNo(env.mapNo, suffix))}</span>`;
		const figure = new state.Token('html_block', '', 0);
		figure.content =
			`<figure class="article-figure"><div class="crop-marks">` +
			`<img src="${escape(image.attrGet('src') ?? '')}" alt="${escape(image.content)}" loading="lazy" decoding="async">` +
			`</div><figcaption><span>${escape(title)}</span>${no}</figcaption></figure>\n`;
		tokens.splice(i, 3, figure);
	}
});

function countWords(tokens: Token[]): number {
	const parts: string[] = [];
	for (const token of tokens) {
		for (const child of token.children ?? []) {
			if (child.type === 'text' || child.type === 'code_inline') parts.push(child.content);
		}
	}
	return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

export function renderArticle(
	markdown: string,
	opts: { mapNo: number | null }
): { html: string; wordCount: number } {
	const env: Env = { mapNo: opts.mapNo, figureIndex: 0 };
	const tokens = md.parse(markdown, env);
	return { html: md.renderer.render(tokens, md.options, env), wordCount: countWords(tokens) };
}

export function readingMinutes(wordCount: number): number {
	return Math.max(1, Math.round(wordCount / 230));
}
