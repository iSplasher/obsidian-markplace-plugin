import { TFile } from "obsidian";

import { createBlock, setupConstant } from "../../../tests/utils";
import { constant } from "../../constants";
import Evaluator from "../../evaluator/evaluator";
import Generator, { GeneratorBuilder } from "../generator";
import FileBuilder from "./file";

describe("File builder", () => {
	let generator: Generator;
	let builder: GeneratorBuilder;
	let evaluator: Evaluator;

	beforeEach(() => {
		setupConstant();
		evaluator = new Evaluator();
		generator = new Generator(new TFile(), createBlock());

		generator.registerBuilder(new FileBuilder());

		builder = generator.builder().builder;
	});

	describe("file", () => {
		test("accessor", async () => {
			const testCtx = await evaluator.run(
				generator,
				"this.r = this.mp.file"
			);
			expect(testCtx?.r).toContainKeys(["path"]);
		});

		test("content", async () => {
			(constant?.app?.vault.read as jest.Mock).mockImplementation(
				(...args) => {
					return Promise.resolve("test");
				}
			);

			const r = await builder.file.content();
			expect(r).toBe("test");
		});
	});
});
