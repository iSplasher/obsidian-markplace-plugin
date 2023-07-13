import Builder from "./base";
import Generator from "./generator";

describe("Generator", () => {
	let generator: Generator;

	beforeEach(() => {
		generator = new Generator();
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

		const builder = generator.builder();

		builder.text("test");

		expect(generator.compile()).toBe("test");
	});

	test("builder can access own context", async () => {
		class TestBuilder extends Builder {
			ctx: string;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.ctx = this.ctx || t;
				this.addContent(this.ctx);
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder();

		builder.text("test");
		builder.text("other");

		expect(generator.compile()).toBe("testtest");
	});

	test("builder can access vars set in constructor", async () => {
		class TestBuilder extends Builder {
			ctx: string;
			constructor() {
				super();
				this.addProperty("text", this.text);
				this.ctx = "const";
			}

			text(t: string) {
				this.ctx = this.ctx || t;
				this.addContent(this.ctx);
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder();

		builder.text("test");
		builder.text("other");

		expect(generator.compile()).toBe("constconst");
	});

	test("builder don't inherit base builder's fields", async () => {
		class TestBuilder extends Builder {
			ctx: string;
			constructor() {
				super();
				this.addProperty("text", this.text);
				// @ts-ignore
				this.ctx = this.props;
			}

			text(t: string) {
				this.addContent(this.ctx ? "1" : "2");
				// @ts-ignore
				this.addContent(this.props ? "1" : "2");
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder = generator.builder();

		builder.text("test");

		expect(generator.compile()).toBe("22");
	});

	test("builders don't share context", async () => {
		class TestBuilder extends Builder {
			ctx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			text(t: string) {
				this.ctx = this.ctx || "";
				this.addContent(this.ctx);
				this.ctx += t;
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder();

		builder1.text("test1");

		expect(generator.compile()).toBe("");

		const builder2 = generator.builder();

		builder2.text("test2");

		expect(generator.compile()).toBe("");
	});

	test("builders retain their methods", async () => {
		class TestBuilder extends Builder {
			ctx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			custom(): void {
				this.ctx = "custom";
			}

			text(t: string) {
				this.addContent(this.ctx ?? "");
				this.custom();
			}
		}

		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder();

		expect(builder1?.onAfterEvaluation).toBeUndefined();
		builder1.text("test1");
		expect(generator.compile()).toBe("");
		builder1.text("test1");
		expect(generator.compile()).toBe("custom");
	});

	test("some base builder functions don't get overriden while other do", async () => {
		class TestBuilder extends Builder {
			ctx: any;
			constructor() {
				super();
				this.addProperty("text", this.text);
			}

			onAfterEvaluation(): void {
				this.ctx = "evaluated";
			}

			// @ts-ignore
			properties(): void {
				this.ctx = "properties";
			}

			text(t: string) {
				this.addContent(this.ctx ?? "");
				this.onAfterEvaluation();
				this.properties();
			}
		}

		// @ts-ignore
		generator.registerBuilder(new TestBuilder());

		const builder1 = generator.builder();

		expect(builder1?.onAfterEvaluation).toBeUndefined();
		builder1.text("test1");
		expect(generator.compile()).toBe("");
		builder1.text("test1");
		expect(generator.compile()).toBe("evaluated");
	});

	test("builder functions get overriden", async () => {
		class TestBuilder extends Builder {
			ctx: any;
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

		const builder1 = generator.builder();

		builder1.text("test1");
		expect(generator.compile()).toBe("1");
	});
});
