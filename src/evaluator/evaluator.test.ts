import { MarkdownView } from "obsidian";

import { createBlock } from "../../tests/utils";
import Builder from "../generator/base";
import Generator from "../generator/generator";
import Evaluator from "./evaluator";

describe("Evaluating code", () => {
	let evaluator: Evaluator;
	let generator: Generator;

	beforeEach(() => {
		evaluator = new Evaluator();
		generator = new Generator(new MarkdownView(null as any), createBlock());
	});

	test("can evaluate simple code", async () => {
		const testCtx = await evaluator.run(
			generator,
			`
            this.r = 2 + 2
        `
		);

		expect(testCtx.r).toBe(4);
	});
	test("is local scope", async () => {
		expect.assertions(3);

		try {
			await evaluator.run(
				generator,
				`
                this.r = logger
            `
			);
		} catch (e) {
			expect(e).toBeDefined();
		}

		try {
			await evaluator.run(
				generator,
				`
                this.r = AsyncFunction
            `
			);
		} catch (e) {
			expect(e).toBeDefined();
		}

		try {
			await evaluator.run(
				generator,
				`
                this.r = local
            `
			);
		} catch (e) {
			expect(e).toBeDefined();
		}
	});

	test("can't do anything about global", async () => {
		const testCtx = await evaluator.run(
			generator,
			`
            this.r = global
        `
		);

		expect(testCtx.r).toBe(global);
	});

	test("restricted global app object", async () => {
		const testCtx = await evaluator.run(
			generator,
			`
            this.r = app
        `
		);

		expect(testCtx.r).toBeUndefined();
	});

	test("has local mp object", async () => {
		let testCtx = await evaluator.run(
			generator,
			`
            this.r = this.mp
        `
		);

		expect(testCtx.r).toBeDefined();

		testCtx = await evaluator.run(
			generator,
			`
            this.r = mp
        `
		);

		expect(testCtx.r).toBeDefined();
	});

	test("can't reassign predfined context", async () => {
		await evaluator.run(
			generator,
			`
            this.mp = 2
        `
		);

		const testCtx = await evaluator.run(
			generator,
			`
            this.mp = this.mp
        `
		);

		expect(testCtx.mp).not.toBe(2);
	});

	test("can't reassign predefined locals", async () => {
		expect.assertions(2);

		try {
			await evaluator.run(
				generator,
				`
                mp = 2
            `
			);
		} catch (e) {
			expect(e).toBeDefined();
		}

		try {
			await evaluator.run(
				generator,
				`
                const mp = 2
            `
			);
		} catch (e) {
			expect(e).toBeDefined();
		}
	});

	test("can't overshadow predefined locals", async () => {
		const r = await evaluator.run(
			generator,
			`
            global.mp = 2;

            this.r = mp === 2 ? 2 : 1;
        `
		);

		expect(r.r).toBe(1);
	});

	test("doesn't keep locals between executions", async () => {
		expect.assertions(1);

		await evaluator.run(
			generator,
			`
            const blahblah = 2;
        `
		);

		try {
			const r = await evaluator.run(
				generator,
				`
            this.r = blahblah;
            `
			);

			console.log(r);
		} catch (e) {
			expect(e).toBeDefined();
		}
	});

	test("keeps context between executions", async () => {
		await evaluator.run(
			generator,
			`
            this.blahblah = 2;
        `
		);

		const r = await evaluator.run(
			generator,
			`
            this.r = this.blahblah;
            `
		);

		expect(r.r).toBe(2);
	});

	// this doesn't work in nodejs , but works in browser
	test.skip("can toplevel async/await", async () => {
		const testCtx = await evaluator.run(
			generator,
			`
            this.r = await Promise.resolve(2);
        `
		);

		expect(testCtx.r).toBe(2);
	});

	test("can return anytime", async () => {
		const testCtx = await evaluator.run(
			generator,
			`
            this.r = 1
            this.r = 2
            return
            this.r = 3
        `
		);

		expect(testCtx.r).toBe(2);
	});
	test("evaluation functions get executed and has the right context", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			async onBeforeEvaluation(...args: any[]) {
				this.testCtx = {
					before: true,
					beforeMp: this.mp,
				};
			}

			async onAfterEvaluation(...args: any[]) {
				this.testCtx.after = true;
				this.testCtx.afterMp = this.mp;
			}

			text(t: string) {
				return this.testCtx;
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder());

		const testCtx = await evaluator.run(
			generator,
			"this.r = mp.text('test')"
		);

		expect(testCtx.r?.before).toBe(true);
		expect(testCtx.r?.beforeMp).toBeDefined();
		expect(testCtx.r?.after).toBe(true);
		expect(testCtx.r?.afterMp).toBeDefined();
	});

	test("builder can access BuilderContext", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.testCtx = {
					mp: this.mp,
					ctx: this.ctx,
				};
				return this.testCtx;
			}
		}

		generator.registerBuilder(new TestBuilder());

		const testCtx = await evaluator.run(
			generator,
			"this.r = mp.text('test')"
		);

		["mp", "ctx"].forEach((k) => {
			expect(testCtx.r[k]).toBeDefined();
		});
	});

	test("builder getters and setters works", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.testCtx = {
					mp: this.mp,
					testMp: this.test,
				};
				return this.testCtx;
			}

			get test() {
				return this.mp;
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder());

		const testCtx = await evaluator.run(
			generator,
			"this.r = mp.text('test')"
		);

		expect(testCtx.r.mp).toBeDefined();
		expect(testCtx.r.testMp).toBe(testCtx.r.mp);
	});

	test("builder accessor addProperty", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty(
					"text",
					// @ts-ignore
					Object.getOwnPropertyDescriptor(
						TestBuilder.prototype,
						"text"
					)
				);
			}

			get text() {
				return this.mp;
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder());

		const testCtx = await evaluator.run(generator, "this.r = mp.text");

		expect(testCtx.r).toBeDefined();
	});

	test("builder accessor addProperty will get overridden", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor(prop: string) {
				super();
				this.testCtx = prop;
				this.addProperty(
					"text",
					// @ts-ignore
					Object.getOwnPropertyDescriptor(
						TestBuilder.prototype,
						"text"
					)
				);
			}

			get text() {
				return this.testCtx;
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder("text1"));
		generator.registerBuilder(new TestBuilder("text2"));

		const testCtx = await evaluator.run(generator, "this.r = mp.text");

		expect(testCtx.r).toBe("text2");
	});
});
