import { MarkdownView, TFile, Vault } from 'obsidian';

import { Parsed } from '../parser/parser';
import { dedent } from '../utils/misc';
import MarkPlaceRenderer from './renderer';

const SEPARATOR_TOKEN = "---";

describe("Rendering blocks", () => {
	let view: MarkdownView;
	let renderer: MarkPlaceRenderer;
	let parsed: Parsed;

	beforeEach(() => {
		jest.spyOn(console, "warn").mockImplementation(() => {});
		jest.spyOn(console, "log").mockImplementation(() => {});
		jest.spyOn(console, "error").mockImplementation(() => {});

		const vault = new Vault();
		view = new MarkdownView(jest.fn() as any);
		view.file = new TFile();

		const parseContent = "";

		parsed = new Parsed({ content: parseContent });
		renderer = new MarkPlaceRenderer(vault);
	});

	test("can render block", async () => {
		parsed.update({
			content: "%%{ start }%%\nmp.text('Block[start]')\n%%{ end }%%",
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb("");
			return written;
		});

		await renderer.onRender(view, parsed);

		const blocks = [...parsed.blocks.values()];

		const block = blocks?.[0];
		const rendered = `\nBlock[${block.id}]\n`;

		expect(block.postContent).toEqual(rendered);

		expect(written).toEqual(
			`%%{ start }%%\nmp.text('Block[start]')\n\n%%{ ${SEPARATOR_TOKEN} }%%${rendered}%%{ end }%%`
		);
	});

	test("can render singleline block", async () => {
		parsed.update({
			content: "%%{ start }%% mp.text('Block[start]') %%{ end }%%",
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb("");
			return written;
		});

		await renderer.onRender(view, parsed);

		const blocks = [...parsed.blocks.values()];

		const block = blocks?.[0];
		const rendered = `Block[${block.id}]`;

		expect(block.postContent).toEqual(rendered);

		expect(written).toEqual(
			`%%{ start }%% mp.text('Block[start]')  %%{ ${SEPARATOR_TOKEN} }%%${rendered}%%{ end }%%`
		);
	});

	test("can stitch simple content", async () => {
		const originalContent = dedent`
        %%{ start }%%
        mp.text('Block[start]')
        %%{ end }%%
        `;

		parsed.update({
			content: originalContent,
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		const blocks = [...parsed.blocks.values()];

		expect(blocks.every((block) => block.hasRendered())).toBe(true);

		expect(written).toEqual(`${blocks?.[0].outerContent}`);
	});

	test("can stitch singleline content", async () => {
		const originalContent = dedent`
        # %%{ start }%% mp.text('Block[start]') %%{ end }%%
        `;

		parsed.update({
			content: originalContent,
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		const rendered = `Block[start]`;

		const blocks = [...parsed.blocks.values()];

		expect(blocks.every((block) => block.hasRendered())).toBe(true);

		expect(written).toEqual(
			`# %%{ start }%% mp.text('Block[start]')  %%{ ${SEPARATOR_TOKEN} }%%${rendered}%%{ end }%%`
		);
	});

	test("can stitch singleline with comment content", async () => {
		const originalContent = dedent`
        # %%{ start }%%%%mp.text('Block[start]')%%%%{ end }%%
        `;

		parsed.update({
			content: originalContent,
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		const rendered = `Block[start]`;

		const blocks = [...parsed.blocks.values()];

		expect(blocks.every((block) => block.hasRendered())).toBe(true);

		expect(written).toEqual(
			`# %%{ start }%%%%mp.text('Block[start]')%% %%{ ${SEPARATOR_TOKEN} }%%${rendered}%%{ end }%%`
		);
	});

	test("can stitch leading and trailing content", async () => {
		const originalContent = dedent`
        leading

        %%{ start }%%
        \ncontent\n
        %%{ end }%%

        trailing
        `;

		parsed.update({
			content: originalContent,
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		const blocks = [...parsed.blocks.values()];

		expect(written).toEqual(
			`leading\n\n${blocks?.[0].outerContent}\n\ntrailing`
		);
	});

	test("can stitch leading and trailing content with multiple blocks", async () => {
		const originalContent = dedent`
        leading

        %%{ start }%%
        \ncontent\n


        %%{ end }%%
        
        trailing

        %%{ start 2 }%%

        \ncontent\n


        %%{ end }%%

        trailing
        `;

		parsed.update({
			content: originalContent,
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		const blocks = [...parsed.blocks.values()];

		const content1 = blocks?.[0].outerContent;
		const content2 = blocks?.[1].outerContent;

		expect(written).toEqual(dedent`
        leading

        ${content1}
        
        trailing

        ${content2}

        trailing
        `);
	});

	test("can stitch leading and trailing content with singleline blocks", async () => {
		const originalContent = dedent`
        leading

        # %%{ title }%% content %%{ end }%%

        > Hello %%{ name }%% content %%{ end }%%!
        
        trailing
        `;

		parsed.update({
			content: originalContent,
		});
		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		const blocks = [...parsed.blocks.values()];

		const content1 = blocks?.[0].outerContent;
		const content2 = blocks?.[1].outerContent;

		expect(written).toEqual(dedent`
        leading

        # ${content1}

        > Hello ${content2}!

        trailing
        `);
	});

	test("won't rerender", async () => {
		const originalContent = dedent`
        leading

        %%{ start }%%
        mp.text('Block[start]')


        %%{ end }%%
        
        trailing

        %%{ start 2 }%%

        mp.text('Block[start 2]')


        %%{ end }%%

        trailing
        `;

		parsed.update({
			content: originalContent,
		});

		expect(parsed.hasChanged()).toBe(true);
		expect(parsed.needsRender()).toBe(true);

		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		expect(written.length > 0).toBe(true);
		parsed.update({
			content: written,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(false);

		written = "";
		parsed.update({
			content: originalContent,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(true);

		await renderer.onRender(view, parsed);

		expect(written.length > 0).toBe(true);

		parsed.update({
			content: written,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(false);

		const originalContent2 = dedent`
        %%{ start }%%
        mp.text('Block[start]')


        %%{ end }%%

        %%{ start 2 }%%

        mp.text('Block[start 2]')


        %%{ end }%%
        `;

		written = "";
		parsed.update({
			content: originalContent2,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(true);
	});

	test("won't rerender after rendered content", async () => {
		const originalContent = dedent`
        leading

        %%{ start }%%
        mp.text('Block[start]')

		%%{ ${SEPARATOR_TOKEN} }%%

		\render\n

        %%{ end }%%
        
        trailing

        %%{ start 2 }%%

        mp.text('Block[start 2]')

		%%{ ${SEPARATOR_TOKEN} }%%

		\render\n

        %%{ end }%%

        trailing
        `;

		parsed.update({
			content: originalContent,
		});

		expect(parsed.hasChanged()).toBe(true);
		expect(parsed.needsRender()).toBe(true);

		let written = "";

		(renderer.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb(originalContent);
			return written;
		});

		await renderer.onRender(view, parsed);

		expect(written.length > 0).toBe(true);

		parsed.update({
			content: written,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(false);

		const blocks = [...parsed.blocks.values()];

		const originalContent2 = dedent`
        %%{ start }%%
        mp.text('Block[start]')

		%%{ ${SEPARATOR_TOKEN} }%%

		${blocks?.[0].postContent}

        %%{ end }%%
        
        %%{ start 2 }%%

        mp.text('Block[start 2]')

		%%{ ${SEPARATOR_TOKEN} }%%

		${blocks?.[1].postContent}

        %%{ end }%%
        `;

		written = "";

		parsed.update({
			content: originalContent2,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(false);

		// new precontent
		const originalContent3 = dedent`
        %%{ start }%%
        
		mp.text('new precontent')

		%%{ ${SEPARATOR_TOKEN} }%%

		${blocks?.[0].postContent}

        %%{ end }%%
        
        %%{ start 2 }%%

        mp.text('Block[start 2]')

		%%{ ${SEPARATOR_TOKEN} }%%

		${blocks?.[1].postContent}

        %%{ end }%%
        `;

		written = "";

		parsed.update({
			content: originalContent3,
		});

		expect(parsed.hasChanged()).toBe(true);
		expect(parsed.needsRender()).toBe(true);

		await renderer.onRender(view, parsed);

		expect(written.length > 0).toBe(true);

		parsed.update({
			content: written,
		});

		// new postcontent
		const originalContent4 = dedent`
        %%{ start }%%
        
		mp.text('new precontent')

		%%{ ${SEPARATOR_TOKEN} }%%

		${blocks?.[0].postContent}

        %%{ end }%%
        
        %%{ start 2 }%%

        mp.text('Block[start 2]')

		%%{ ${SEPARATOR_TOKEN} }%%

		new postcontent

        %%{ end }%%
        `;

		written = "";

		parsed.update({
			content: originalContent4,
		});

		expect(parsed.hasChanged()).toBe(false);
		expect(parsed.needsRender()).toBe(true);
	});
});
