import { TFile, Vault } from "obsidian";

import { createBlock, setupConstant, teardownConstant } from "../tests/utils";
import Cache from "./cache";
import { Block } from "./parser/parser";

beforeEach(() => {
	const c = setupConstant({});
	c.settings.cache = true;
});

afterEach(() => {
	teardownConstant();
});

const FILE_HEADER = `
THIS FILE IS AUTOGENERATED BY MARKPLACE. DO NOT EDIT THIS FILE DIRECTLY.
IT WILL BE OVERWRITTEN. IT IS OK TO DELETE THIS FILE TO RESET THE CACHE.

---
\`\`\`
`;

const FILE_FOOTER = `
\`\`\`
---
`;

describe("cache initialization and reading and writing", () => {
	const vault = new Vault();

	test("cache path adds ext", async () => {
		const cache = new Cache(vault, "test");

		expect(cache.path).toBe("test.md");
	});

	test("cache initialization creates file if not exists", async () => {
		const cache = new Cache(vault, "test");
		// @ts-ignore
		cache.loaded = true;

		(cache.vault.adapter.exists as jest.Mock).mockReturnValue(false);
		(cache.vault.create as jest.Mock).mockReturnValue(true);

		// @ts-ignore
		await cache.init();

		expect(cache.vault.adapter.exists).toBeCalledWith(
			"__normalized__/test.md"
		);
		expect(cache.vault.create).toBeCalledWith(
			"__normalized__/test.md",
			expect.anything()
		);
	});

	test("cache initialization causes load initially", async () => {
		const cache = new Cache(vault, "test");
		// @ts-ignore
		cache.load = jest.fn();

		// @ts-ignore
		expect(cache.loaded).toBe(false);

		// @ts-ignore
		await cache.init();

		// @ts-ignore
		expect(cache.load).toBeCalled();
	});

	test("cache load fails on wrong data", async () => {
		const cache = new Cache(vault, "test");
		(cache.vault.adapter.exists as jest.Mock).mockReturnValue(true);
		(cache.vault.create as jest.Mock).mockReturnValue(true);
		(cache.vault.read as jest.Mock).mockReturnValue("wrong data");

		// @ts-ignore
		expect(cache.loaded).toBe(false);

		// @ts-ignore
		await cache.init();

		// @ts-ignore
		expect(cache.loaded).toBe(false);
	});

	describe("cache initialization and reading and writing", () => {
		let cache: Cache;

		beforeEach(() => {
			cache = new Cache(vault, "test");
			(cache.vault.adapter.exists as jest.Mock).mockReturnValue(true);
			(cache.vault.create as jest.Mock).mockReturnValue(true);
			const f = new TFile();
			(cache.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(f);
		});

		test("cache load fails on wrong json", async () => {
			const d = {
				version: "1.0.0",
				blocks: {
					test: {
						__test__: ["content"],
					},
				},
			};

			(cache.vault.read as jest.Mock).mockReturnValue(
				`${FILE_HEADER}${JSON.stringify(d)}${FILE_FOOTER}`
			);

			// @ts-ignore
			expect(cache.loaded).toBe(false);

			// @ts-ignore
			await cache.init();

			// @ts-ignore
			expect(cache.loaded).toBe(false);
		});

		test("cache load succeeds on correct data", async () => {
			const d = {
				version: "1.0.0",
				blocks: {
					test: {
						history: ["content"],
					},
				},
			};

			(cache.vault.read as jest.Mock).mockReturnValue(
				`${FILE_HEADER}${JSON.stringify(d)}${FILE_FOOTER}`
			);

			// @ts-ignore
			expect(cache.loaded).toBe(false);

			// @ts-ignore
			await cache.init();

			// @ts-ignore
			expect(cache.loaded).toBe(true);

			// @ts-ignore
			expect(cache.data).toMatchObject(d);
		});
	});

	test("cache writes correct data", async () => {
		const cache = new Cache(vault, "test");

		let written = "";

		(cache.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb("");
			return written;
		});

		const d = {
			version: "1.0.0",
			blocks: {
				test: {
					history: ["content"],
				},
			},
		};

		// @ts-ignore
		cache.data = d;

		// @ts-ignore
		expect(cache.loaded).toBe(false);

		// @ts-ignore
		await cache.commit();

		// @ts-ignore
		expect(cache.loaded).toBe(true);

		// @ts-ignore
		expect(written).toEqual(
			`${FILE_HEADER}${JSON.stringify(d, null, 4)}${FILE_FOOTER}`
		);
	});
});

describe("cache block caching", () => {
	const vault = new Vault();

	(vault.read as jest.Mock).mockReturnValue("");

	let block: Block;

	beforeEach(() => {
		const content = "block content";

		block = createBlock(content);
	});

	test("a block can be cached successfully", async () => {
		const cache = new Cache(vault, "test");

		const r = await cache.cacheBlocks("test", [block]);

		expect(r).toMatchObject({
			"__normalized__/test:start": {
				history: ["block content"],
			},
		});

		// @ts-ignore
		expect(r).toMatchObject(cache.data.blocks);
	});

	test("a rendered block can be cached successfully", async () => {
		const cache = new Cache(vault, "test");
		block.render("new content");

		const r = await cache.cacheBlocks("test", [block]);

		expect(r).toMatchObject({
			"__normalized__/test:start": {
				history: ["block content"],
			},
		});
	});

	test("duplicate block ids fails", async () => {
		const cache = new Cache(vault, "test");

		const r = await cache.cacheBlocks("test", [block, block]);

		expect(r).toBeEmptyObject();
	});

	test("can merge history", async () => {
		const cache = new Cache(vault, "test");

		let written = "";

		(cache.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb("");
			return written;
		});

		await cache.cacheBlocks("test", [block]);

		// @ts-ignore
		block._content = "block content 2";
		// @ts-ignore
		block.processContent();

		const r = await cache.cacheBlocks("test", [block]);

		expect(r["__normalized__/test:start"].history).toEqual([
			"block content",
			"block content 2",
		]);
	});

	test("only merges history if changed", async () => {
		const cache = new Cache(vault, "test");

		let written = "";

		(cache.vault.process as jest.Mock).mockImplementation((path, cb) => {
			written = cb("");
			return written;
		});

		await cache.cacheBlocks("test", [block]);

		// @ts-ignore
		block._content = "block content 2";
		// @ts-ignore
		block.processContent();

		await cache.cacheBlocks("test", [block]);

		// @ts-ignore
		block._content = "block content";
		// @ts-ignore
		block.processContent();

		await cache.cacheBlocks("test", [block]);
		const r = await cache.cacheBlocks("test", [block]);

		expect(r["__normalized__/test:start"].history).toEqual([
			"block content",
			"block content 2",
			"block content",
		]);
	});

	test("can merge history after render", async () => {
		const cache = new Cache(vault, "test");

		const r = await cache.cacheBlocks("test", [block]);

		expect(r).toMatchObject({
			"__normalized__/test:start": {
				history: ["block content"],
			},
		});

		block.render("new content");

		const r2 = await cache.cacheBlocks("test", [block]);

		expect(r2).toMatchObject({
			"__normalized__/test:start": {
				history: ["block content"], // pre content is the same
			},
		});
	});
});
