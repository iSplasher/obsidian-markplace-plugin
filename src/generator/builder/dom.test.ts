import { MarkdownView } from 'obsidian';

import { createBlock, setupConstant } from '../../../tests/utils';
import Evaluator from '../../evaluator/evaluator';
import Generator, { GeneratorBuilder } from '../generator';
import DomBuilder from './dom';

describe("Dom builder", () => {
	let generator: Generator;
	let builder: GeneratorBuilder;
	let evaluator: Evaluator;

	beforeEach(() => {
		setupConstant();
		evaluator = new Evaluator();
		generator = new Generator(new MarkdownView(null as any), createBlock());

		generator.registerBuilder(new DomBuilder());

		builder = generator.builder().builder;
	});

	describe("dom", () => {
		test("accessor", async () => {
			const testCtx = await evaluator.run(
				generator,
				"this.r = this.mp.dom"
			);
			expect(testCtx?.r).toContainKeys(["$", "$", "find", "html", "css", "text"]);
		});
	});
});
