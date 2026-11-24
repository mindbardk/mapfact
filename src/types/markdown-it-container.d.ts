// @types/markdown-it-container hænger fast på @types/markdown-it < 14. Denne
// minimale erklæring dækker den brug, article.ts har.
declare module 'markdown-it-container' {
	import type MarkdownIt from 'markdown-it';
	import type Token from 'markdown-it/lib/token.mjs';

	interface ContainerOptions {
		validate?(params: string): boolean;
		render?(tokens: Token[], idx: number): string;
		marker?: string;
	}

	const container: (md: MarkdownIt, name: string, options?: ContainerOptions) => void;
	export default container;
}
