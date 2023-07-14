import Generator, { GeneratorBuilder } from "../generator";
import TextBuilder from "./text";

describe("Text builder", () => {
	let generator: Generator;
	let builder: GeneratorBuilder;

	beforeEach(() => {
		generator = new Generator();

		generator.registerBuilder(new TextBuilder());

		builder = generator.builder();
	});

	describe("text", () => {
		it("basic text", () => {
			builder.text("test");
			expect(generator.compile()).toBe("test");
		});
	});

	describe("newline", () => {
		it("basic text newline", () => {
			builder.newline();
			builder.text("test");
			builder.newLine();
			expect(generator.compile()).toBe("\ntest\n");
		});
	});
});
