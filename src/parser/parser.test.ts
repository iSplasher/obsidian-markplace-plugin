import { Parsed } from "./parser";

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
		expect(p.blocks.get(9)?.content).toMatch("content");
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

		expect(p.blocks.size).toBe(0);
		expect(p.isDirty()).toBe(false);
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
});
