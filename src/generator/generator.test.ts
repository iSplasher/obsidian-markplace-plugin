import { MarkdownView } from "obsidian";

import { createBlock } from "../../tests/utils";
import Builder from "./base";
import Generator from "./generator";

describe("Generator", () => {
	let generator: Generator;

	beforeEach(() => {
		generator = new Generator(new MarkdownView(null as any), createBlock());
	});

	test("can register builder", async () => {
		class TestBuilder extends Builder {
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.addContent(t);
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder().builder;

		builder.text("test");

		expect(generator.compile()).toBe("test");
	});

	test("builder can access own context", async () => {
		class TestBuilder extends Builder {
			testCtx: string;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.testCtx = this.testCtx || t;
				this.addContent(this.testCtx);
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder().builder;

		builder.text("test");
		builder.text("other");

		expect(generator.compile()).toBe("testtest");
	});

	test("builder can access vars set in constructor", async () => {
		class TestBuilder extends Builder {
			testCtx: string;
			constructor() {
				super();
				this.addProperty("text", this.text);
				this.testCtx = "const";
			}

			text(t: string) {
				this.testCtx = this.testCtx || t;
				this.addContent(this.testCtx);
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder().builder;

		builder.text("test");
		builder.text("other");

		expect(generator.compile()).toBe("constconst");
	});

	test("builder don't inherit base builder's fields", async () => {
		class TestBuilder extends Builder {
			testCtx: string;
			constructor() {
				super();
				this.addProperty("text", this.text);
				// @ts-ignore
				this.testCtx = this.props;
			}

			text(t: string) {
				this.addContent(this.testCtx ? "1" : "2");
				// @ts-ignore
				this.addContent(this.props ? "1" : "2");
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder().builder;

		builder.text("test");

		expect(generator.compile()).toBe("22");
	});

	test("builders don't share context", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.testCtx = this.testCtx || "";
				this.addContent(this.testCtx);
				this.testCtx += t;
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder().builder;

		builder1.text("test1");

		expect(generator.compile()).toBe("");

		const builder2 = generator.builder().builder;

		builder2.text("test2");

		expect(generator.compile()).toBe("");
	});

	test("builders retain their methods", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			custom(): void {
				this.testCtx = "custom";
			}

			text(t: string) {
				this.addContent(this.testCtx ?? "");
				this.custom();
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder().builder;

		expect(builder1?.onAfterEvaluation).toBeUndefined();
		builder1.text("test1");
		expect(generator.compile()).toBe("");
		builder1.text("test1");
		expect(generator.compile()).toBe("custom");
	});

	test("some base builder functions don't get overriden while other do", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			async onAfterEvaluation(...args: any[]) {
				this.testCtx = "evaluated";
			}

			// @ts-ignore
			properties(): void {
				this.testCtx = "properties";
			}

			async text(t: string) {
				this.addContent(this.testCtx ?? "");
				await this.onAfterEvaluation();
				this.properties();
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder().builder;

		expect(builder1?.onAfterEvaluation).toBeUndefined();
		await builder1.text("test1");
		expect(generator.compile()).toBe("");
		await builder1.text("test1");
		expect(generator.compile()).toBe("evaluated");
	});

	test("builder functions get overriden", async () => {
		class TestBuilder extends Builder {
			testCtx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.addContent(this.properties().size === 0 ? "1" : "2");
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder().builder;

		builder1.text("test1");
		expect(generator.compile()).toBe("1");
	});
});
