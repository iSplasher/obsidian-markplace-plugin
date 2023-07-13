import Generator from "../generator";

describe("Text compiling", () => {
	let generator: Generator;

	beforeEach(() => {
		generator = new Generator();
	});

	describe("text content", () => {
		it("basic text", () => {
			const builder = generator.builder();
			builder.text("test");
			expect(generator.compile()).toBe("test");
		});
	});
});
