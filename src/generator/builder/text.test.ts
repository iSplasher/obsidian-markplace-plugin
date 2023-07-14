import { TFile } from "obsidian";

import { createBlock } from "../../../tests/utils";
import Generator, { GeneratorBuilder } from "../generator";
import TextBuilder from "./text";

describe("Text builder", () => {
	let generator: Generator;
	let builder: GeneratorBuilder;

	beforeEach(() => {
		generator = new Generator(new TFile(), createBlock());

		generator.registerBuilder(new TextBuilder());

		builder = generator.builder().builder;
	});

	describe("text", () => {
		test("basic text", async () => {
			builder.text("test");
			expect(generator.compile()).toBe("test");
		});
	});

	describe("newline", () => {
		test("basic text newline", async () => {
			builder.newline();
			builder.text("test");
			builder.newLine();
			expect(generator.compile()).toBe("\ntest\n");
		});
	});
});
