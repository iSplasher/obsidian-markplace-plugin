import { Block, Parsed } from "./parser";

const SEPARATOR_TOKEN = "---------------------------";

describe("Tag location parsing", () => {
	test("simple tag is parsed", async () => {
		const content = "%%{ test }%%";

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content)?.[0]).toMatchObject({
			start: 0,
			end: content.length,
			content: " test ",
			outerContent: content,
		});
	});

	test("Token is escaped in tag", async () => {
		const content = "%%{ test\\}%% }%%";

		const p = new Parsed({ content });

		// @ts-ignore
		const r = p.getTagLocations(content);

		expect(r?.[0]).toMatchObject({
			start: 0,
			end: content.length,
			content: " test\\}%% ",
			outerContent: "%%{ test\\}%% }%%",
			escapes: [8],
		});

		expect(r[0].outerContent[r[0].escapes[0]]).toBe("\\");
	});

	test("Token is escaped in tag at start", async () => {
		const content = "\\%%%{ % test\\}%% }%%";

		const p = new Parsed({ content });

		// @ts-ignore
		const r = p.getTagLocations(content);

		expect(r?.[0]).toMatchObject({
			start: 2,
			end: content.length,
			content: " % test\\}%% ",
			outerContent: "%%{ % test\\}%% }%%",
			escapes: [10],
		});

		expect(r[0].outerContent[r[0].escapes[0]]).toBe("\\");
	});

	test("No need for escape on unmatched token at end", async () => {
		const content = "%%{ test} % }%%";

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content)?.[0]).toMatchObject({
			start: 0,
			end: 15,
			content: " test} % ",
			outerContent: "%%{ test} % }%%",
		});
	});

	test("multiline content tag is parsed", async () => {
		const content = `
        # hello world
        %%{ test }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content)?.[0]).toMatchObject({
			start: 31,
			end: 43,
			content: " test ",
			outerContent: "%%{ test }%%",
		});
	});

	test("multiline token is not parsed", async () => {
		const content = `
        # hello world %%{ test
        ok }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content).length).toBe(0);
	});

	test("multiline token is not parsed 2", async () => {
		const content = `
        # hello world %%{ test
        %%{ ok }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content)?.[0]).toMatchObject({
			start: 40,
			end: 50,
			content: " ok ",
			outerContent: "%%{ ok }%%",
		});
	});

	test("multiline token is not parsed 3", async () => {
		const content = `
        # hello world }%% test
        %%{ ok }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content)?.[0]).toMatchObject({
			start: 40,
			end: 50,
			content: " ok ",
			outerContent: "%%{ ok }%%",
		});
	});

	test("multiline token is not parsed 4", async () => {
		const content = `
        # hello world %%{ test
        %%{ ok 
        }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		expect(p.getTagLocations(content).length).toBe(0);
	});

	test("multiple tags are parsed", async () => {
		const content = `
        # hello world
        %%{ test }%% %%{ end }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		const tags = p.getTagLocations(content);

		expect(tags?.[0]).toMatchObject({
			start: 31,
			end: 43,
			content: " test ",
			outerContent: "%%{ test }%%",
		});

		expect(tags?.[1]).toMatchObject({
			start: 44,
			end: 55,
			content: " end ",
			outerContent: "%%{ end }%%",
		});
	});

	test.skip("skips obsidian comment", async () => {
		const content = `
        # hello world
        %%%{ test }%% %%{ end }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		const tags = p.getTagLocations(content);

		expect(tags.length).toBe(0);
	});

	test.skip("skips obsidian comment 2", async () => {
		const content = `
        # hello world
        %%%{ test }%%
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		const tags = p.getTagLocations(content);

		expect(tags?.[0]).toMatchObject({
			start: 49,
			end: 56,
			content: " end ",
			outerContent: "%%{ end }%%",
		});
	});
});

describe("Block parsing", () => {
	test("missing start tag", async () => {
		const content = `
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Missing start block tag");
		}
	});

	test("missing end tag", async () => {
		const content = `
        %%{ hello world }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Missing end block tag");
		}
	});

	test("missing end tag 2", async () => {
		const content = `
        %%{ hello world }%%
        %%{ hello world }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Missing end block tag");
		}
	});

	test("missing end tag with sep", async () => {
		const content = `
        %%{ hello world }%%
        %%{ ${SEPARATOR_TOKEN} }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Missing end block tag");
		}
	});

	test("allow only one sep tag", async () => {
		const content = `
        %%{ hello world }%%
        %%{ ${SEPARATOR_TOKEN} }%%
        %%{ ${SEPARATOR_TOKEN} }%%
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Multiple separator tags");
		}
	});

	test("invalid block tag modifier", async () => {
		const content = `
        %%{[ hello world }%%
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Invalid block tag modifier '['");
		}
	});

	test.skip("Skips obsidian comment", async () => {
		const content = `
        %%%{ hello world }%%
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		expect.assertions(1);
		try {
			// @ts-ignore
			p.scan();
		} catch (e) {
			expect(e.message).toMatch("Missing start block tag");
		}
	});

	test("oneliner block is parsed", async () => {
		const content = "%%{ hello world }%% content %%{ end             }%%";

		const p = new Parsed({ content });

		// @ts-ignore
		p.scan();

		expect(p.blocks.size).toBe(1);
		expect(p.blocks.get(0)?.content).toBe(" content ");
	});

	test("block is parsed", async () => {
		const content = `
        %%{ hello world }%%

        content
        
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		p.scan();

		expect(p.blocks.size).toBe(1);
		expect(p.blocks.get(9)?.content?.trim()).toBe("content");
	});

	test("block with sep is parsed", async () => {
		const content = `
        %%{ hello world }%%

        content

		%%{ ${SEPARATOR_TOKEN} }%%
        
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		p.scan();

		expect(p.blocks.size).toBe(1);
		expect(p.blocks.get(9)?.content?.trim()).toBe(
			`
		content

		%%{ ${SEPARATOR_TOKEN} }%%
		`.trim()
		);
		expect(p.blocks.get(9)?.preContent?.trim()).toBe("content");
		expect(p.blocks.get(9)?.postContent?.trim()).toBe("");
	});

	test("blocks are parsed", async () => {
		const content = `
        %%{ hello world }%%

        content
        
        %%{ end }%%

        %%{ hello world }%%

        other
        
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		// @ts-ignore
		p.scan();

		expect(p.blocks.size).toBe(2);
		expect(p.blocks.get(9)?.content).toMatch("content");
		expect(p.blocks.get(84)?.content).toMatch("other");
	});

	test("parsed can be updated", async () => {
		const content = `
        %%{ hello world }%%

        content
        
        %%{ end }%%
        `;

		const p = new Parsed({ content });

		expect(p.isDirty()).toBe(true);

		p.update();

		expect(p.blockCount()).toBe(1);
		expect(p.isDirty()).toBe(false);

		expect(p.diff(`    ${content}       `)).toBe(false);
		expect(p.diff(`#   ${content}       `)).toBe(true);

		const content2 = "";

		expect(p.isDirty()).toBe(false);

		p.update({ content: content2 });

		expect(p.blockCount()).toBe(0);
		expect(p.isDirty()).toBe(false);
	});
});

describe("Block rendering", () => {
	let block: Block;

	beforeEach(() => {
		const startContent = "start";
		const startOuterContent = `%%{ ${startContent} }%%`;
		const endContent = "end";
		const endOuterContent = `%%{ ${endContent} }%%`;

		const content = "\ncontent\n";

		block = new Block(
			{
				start: 0,
				end: startOuterContent.length,
				content: startContent,
				outerContent: startOuterContent,
				escapes: [],
			},
			0,
			1,
			null,
			{
				start: startOuterContent.length + content.length,
				end:
					startOuterContent.length +
					content.length +
					endOuterContent.length,
				content: endContent,
				outerContent: endOuterContent,
				escapes: [],
			},
			4,
			content.split("\n").length,
			content
		);
	});

	describe("block can add separator tag", () => {
		const sepOuter = `%%{ ${SEPARATOR_TOKEN} }%%`;

		test("when on multiple lines", async () => {
			expect(block.sourceValid()).toBe(true);
			expect(block.preContent).toBe(block.content);
			expect(block.postContent).toBe("");

			// @ts-ignore
			block.addSeparatorTag();

			expect(block.sepTag).not.toBeNull();
			expect(block.sourceValid()).toBe(false);

			const startOuter = block.startTag.outerContent;
			const endOuter = block.endTag.outerContent;

			expect(startOuter).toBe(`%%{ start }%%`);
			expect(endOuter).toBe(`%%{ end }%%`);

			const padStart = "\n";
			const padEnd = "\n";

			const sepContent = `${padStart}${sepOuter}${padEnd}`;

			expect(block.content).toBe(`\ncontent\n${sepContent}`);

			expect(block.startTag.start).toBe(0);
			expect(block.startTag.end).toBe(block.startTag.outerContent.length);

			expect(block.sepTag?.end).toBe(
				// @ts-ignore
				block.sepTag?.start + sepOuter.length
			);

			const sepContentStart = block.mapToContentPosition(
				// @ts-ignore
				block.sepTag?.start
			);

			// @ts-ignore
			const sepContentEnd = block.mapToContentPosition(block.sepTag?.end);

			expect(block.content.slice(sepContentStart, sepContentEnd)).toBe(
				`%%{ ${SEPARATOR_TOKEN} }%%`
			);
			expect(block.sepTag?.start).toBe(23);
			expect(block.sepTag?.end).toBe(58);

			expect(block.endTag?.start).toBe(59);
			expect(block.endTag?.start).toBe(
				block.startTag.end + block.content.length
			);
			expect(block.endTag?.end).toBe(
				block.endTag.start + block.endTag.outerContent.length
			);

			expect(block.startTagLineNumber).toBe(1);
			expect(block.endTagLineNumber).toBe(5);

			expect(block.contentStart).toBe(block.startTag.end);
			expect(block.contentEnd).toBe(block.endTag.start - 1);
			expect(block.preContent).toBe(`\ncontent\n${padStart}`);
			expect(block.postContent).toBe(`${padEnd}`);
		});

		test("when on single line", async () => {
			expect(block.sourceValid()).toBe(true);

			block.content = "content";
			block.endTag.start = block.startTag.end + block.content.length;
			block.endTag.end =
				block.endTag.start + block.endTag.outerContent.length;
			block.endTagLineNumber = block.startTagLineNumber;

			// @ts-ignore
			block.addSeparatorTag();

			expect(block.sepTag).not.toBeNull();

			const startOuter = block.startTag.outerContent;
			const endOuter = block.endTag.outerContent;

			expect(startOuter).toBe(`%%{ start }%%`);
			expect(endOuter).toBe(`%%{ end }%%`);

			const padStart = " ";
			const padEnd = " ";

			const sepContent = `${padStart}${sepOuter}${padEnd}`;

			expect(block.content).toBe(`content${sepContent}`);

			const sepContentStart = block.mapToContentPosition(
				// @ts-ignore
				block.sepTag?.start
			);

			// @ts-ignore
			const sepContentEnd = block.mapToContentPosition(block.sepTag?.end);

			expect(block.content.slice(sepContentStart, sepContentEnd)).toBe(
				`%%{ ${SEPARATOR_TOKEN} }%%`
			);
			expect(block.sepTag?.start).toBe(21);
			expect(block.sepTag?.end).toBe(56);

			expect(block.endTag?.start).toBe(57);
			expect(block.endTag?.start).toBe(
				block.startTag.end + block.content.length
			);
			expect(block.endTag?.end).toBe(
				block.endTag.start + block.endTag.outerContent.length
			);

			expect(block.startTagLineNumber).toBe(1);
			expect(block.endTagLineNumber).toBe(1);

			expect(block.contentStart).toBe(block.startTag.end);
			expect(block.contentEnd).toBe(block.endTag.start - 1);

			expect(block.preContent).toBe(`content${padStart}`);
			expect(block.postContent).toBe(`${padEnd}`);
		});
	});

	describe("block can render content after separate tag", () => {
		test("when on multiple lines", async () => {
			const render = "rendered content";

			expect(block.preContent).toBe("\ncontent\n");
			expect(block.postContent).toBe("");

			const padStart = "\n";
			const padEnd = "\n";

			const rendered = `${padStart}${render}${padEnd}`;

			block.render(render);

			expect(block.sepTag).not.toBeNull();

			expect(block.preContent).toBe(`\ncontent\n\n`);
			expect(block.postContent).toBe(rendered);

			expect(block.content).toBe(
				`\ncontent\n\n${block.sepTag?.outerContent}${rendered}`
			);

			expect(block.startTag.start).toBe(0);
			expect(block.startTag.end).toBe(block.startTag.outerContent.length);

			expect(block.sepTag?.start).toBe(23);
			expect(block.sepTag?.end).toBe(
				// @ts-ignore
				block.sepTag?.start + block.sepTag?.outerContent.length
			);
			expect(block.sepTag?.end).toBe(58);

			expect(block.endTag?.start).toBe(76);
			expect(block.endTag?.start).toBe(
				block.startTag.end + block.content.length
			);
			expect(block.endTag?.end).toBe(
				block.endTag.start + block.endTag.outerContent.length
			);

			// sanity check
			const endOuterPadded = block.endTag.outerContent + "    ";
			const endOuterLength = block.endTag.end - block.endTag.start;
			expect(endOuterPadded.slice(0, endOuterLength)).toBe(
				block.endTag.outerContent
			);
			expect(block.endTag.outerContent[endOuterLength]).toBeUndefined();

			const sepContentEnd = block.mapToContentPosition(
				// @ts-ignore
				block.sepTag?.end
			);

			expect(block.content.slice(sepContentEnd)).toBe(rendered);

			expect(block.startTagLineNumber).toBe(1);
			expect(block.endTagLineNumber).toBe(6);

			expect(block.contentStart).toBe(block.startTag.end);
			expect(block.contentEnd).toBe(block.endTag.start - 1);
			expect(block.preContent).toBe(`\ncontent\n\n`);
		});

		test("when on single line", async () => {
			block.content = "content";
			block.endTag.start = block.startTag.end + block.content.length;
			block.endTag.end =
				block.endTag.start + block.endTag.outerContent.length;
			block.endTagLineNumber = block.startTagLineNumber;

			const render = "rendered content";

			expect(block.preContent).toBe("\ncontent\n");
			expect(block.postContent).toBe("");

			const padStart = "";
			const padEnd = "";

			const rendered = `${padStart}${render}${padEnd}`;

			block.render(render);

			expect(block.sepTag).not.toBeNull();

			expect(block.preContent).toBe(`content `);
			expect(block.postContent).toBe(rendered);

			expect(block.content).toBe(
				`content ${block.sepTag?.outerContent}${rendered}`
			);

			expect(block.startTag.start).toBe(0);
			expect(block.startTag.end).toBe(block.startTag.outerContent.length);

			expect(block.sepTag?.start).toBe(21);
			expect(block.sepTag?.end).toBe(
				// @ts-ignore
				block.sepTag?.start + block.sepTag?.outerContent.length
			);
			expect(block.sepTag?.end).toBe(56);

			expect(block.endTag?.start).toBe(72);
			expect(block.endTag?.start).toBe(
				block.startTag.end + block.content.length
			);
			expect(
				block.content[block.mapToContentPosition(block.endTag.start)]
			).toBeUndefined();
			expect(
				block.content[
					block.mapToContentPosition(block.endTag.start) - 1
				]
			).toBeDefined();
			expect(block.endTag?.end).toBe(
				block.endTag.start + block.endTag.outerContent.length
			);

			// sanity check
			const endOuterPadded = block.endTag.outerContent + "    ";
			const endOuterLength = block.endTag.end - block.endTag.start;
			expect(endOuterPadded.slice(0, endOuterLength)).toBe(
				block.endTag.outerContent
			);
			expect(block.endTag.outerContent[endOuterLength]).toBeUndefined();

			const sepContentEnd = block.mapToContentPosition(
				// @ts-ignore
				block.sepTag?.end
			);

			expect(block.content.slice(sepContentEnd)).toBe(rendered);

			expect(block.startTagLineNumber).toBe(1);
			expect(block.endTagLineNumber).toBe(1);

			expect(block.contentStart).toBe(block.startTag.end);
			expect(block.contentEnd).toBe(block.endTag.start - 1);
			expect(block.preContent).toBe(`content `);
		});
	});

	test("block won't rerender", async () => {
		expect(block.render("world")).toBeTrue();
		expect(block.hasRendered()).toBeTrue();
		expect(block.render("hello")).toBeFalse();
		expect(block.postContent).toBe("\nworld\n");
	});

	describe("block can update rendered content after separate tag", () => {
		test("when shorter render", async () => {
			expect(block.preContent).toBe("\ncontent\n");
			expect(block.postContent).toBe("");

			const render1 = "hello\nworld\n1";

			block.render(render1);

			// @ts-ignore
			block.rendered = false;

			const render2 = "ok";

			block.render(render2);

			const rendered = `\n${render2}\n`;

			expect(block.sepTag).not.toBeNull();

			expect(block.preContent).toBe(`\ncontent\n\n`);
			expect(block.postContent).toBe(rendered);

			expect(block.content).toBe(
				`\ncontent\n\n${block.sepTag?.outerContent}${rendered}`
			);

			expect(block.endTag?.start).toBe(62);
			expect(block.endTag?.start).toBe(
				block.startTag.end + block.content.length
			);
			expect(
				block.content[block.mapToContentPosition(block.endTag.start)]
			).toBeUndefined();
			expect(
				block.content[
					block.mapToContentPosition(block.endTag.start) - 1
				]
			).toBeDefined();
			expect(block.endTag?.end).toBe(
				block.endTag.start + block.endTag.outerContent.length
			);

			// sanity check
			const endOuterPadded = block.endTag.outerContent + "    ";
			const endOuterLength = block.endTag.end - block.endTag.start;
			expect(endOuterPadded.slice(0, endOuterLength)).toBe(
				block.endTag.outerContent
			);
			expect(block.endTag.outerContent[endOuterLength]).toBeUndefined();

			const sepContentEnd = block.mapToContentPosition(
				// @ts-ignore
				block.sepTag?.end
			);

			expect(block.content.slice(sepContentEnd)).toBe(rendered);

			expect(block.endTagLineNumber).toBe(6);

			expect(block.contentStart).toBe(block.startTag.end);
			expect(block.contentEnd).toBe(block.endTag.start - 1);
		});

		test("when longer render", async () => {
			expect(block.preContent).toBe("\ncontent\n");
			expect(block.postContent).toBe("");

			const render1 = "ok";

			block.render(render1);

			// @ts-ignore
			block.rendered = false;

			const render2 = "hello\nworld\n1";

			block.render(render2);

			const rendered = `\n${render2}\n`;

			expect(block.sepTag).not.toBeNull();

			expect(block.preContent).toBe(`\ncontent\n\n`);
			expect(block.postContent).toBe(rendered);

			expect(block.content).toBe(
				`\ncontent\n\n${block.sepTag?.outerContent}${rendered}`
			);

			expect(block.endTag?.start).toBe(73);
			expect(block.endTag?.start).toBe(
				block.startTag.end + block.content.length
			);
			expect(
				block.content[block.mapToContentPosition(block.endTag.start)]
			).toBeUndefined();
			expect(
				block.content[
					block.mapToContentPosition(block.endTag.start) - 1
				]
			).toBeDefined();
			expect(block.endTag?.end).toBe(
				block.endTag.start + block.endTag.outerContent.length
			);

			// sanity check
			const endOuterPadded = block.endTag.outerContent + "    ";
			const endOuterLength = block.endTag.end - block.endTag.start;
			expect(endOuterPadded.slice(0, endOuterLength)).toBe(
				block.endTag.outerContent
			);
			expect(block.endTag.outerContent[endOuterLength]).toBeUndefined();

			const sepContentEnd = block.mapToContentPosition(
				// @ts-ignore
				block.sepTag?.end
			);

			expect(block.content.slice(sepContentEnd)).toBe(rendered);

			expect(block.endTagLineNumber).toBe(8);

			expect(block.contentStart).toBe(block.startTag.end);
			expect(block.contentEnd).toBe(block.endTag.start - 1);
		});
	});
});

describe("Parser utilities", () => {
	test("correct line number gets returned", async () => {
		const content = "\n \n \n \n3\n\n\n";

		const p = new Parsed({ content });

		// @ts-ignore
		const lineNumber = p.getLineNumberAtPosition(7);

		expect(lineNumber).toBe(5);
	});

	test("correct line numbers gets returned", async () => {
		const content = "\n3 \n \n \n3\n3\n\n";

		const p = new Parsed({ content });

		// @ts-ignore
		const lineNumbers = p.getLineNumberAtPositions([10, 1, 8]);

		expect(lineNumbers).toEqual([6, 2, 5]);
	});
});
