import Generator from "../generator/generator";
import Evaluator from "./evaluator";

describe("Evaluating code", () => {
	let evaluator: Evaluator;
	let generator: Generator;

	beforeEach(() => {
		evaluator = new Evaluator();
		generator = new Generator();
	});

	test("can evaluate simple code", async () => {
		const ctx = await evaluator.run(
			generator,
			`
            this.r = 2 + 2
        `
		);

		expect(ctx.r).toBe(4);
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
		const ctx = await evaluator.run(
			generator,
			`
            this.r = global
        `
		);

		expect(ctx.r).toBe(global);
	});

	test("restricted global app object", async () => {
		const ctx = await evaluator.run(
			generator,
			`
            this.r = app
        `
		);

		expect(ctx.r).toBeUndefined();
	});

	test("has local mp object", async () => {
		let ctx = await evaluator.run(
			generator,
			`
            this.r = this.mp
        `
		);

		expect(ctx.r).toBeDefined();

		ctx = await evaluator.run(
			generator,
			`
            this.r = mp
        `
		);

		expect(ctx.r).toBeDefined();
	});

	test("can't reassign predfined context", async () => {
		await evaluator.run(
			generator,
			`
            this.mp = 2
        `
		);

		const ctx = await evaluator.run(
			generator,
			`
            this.mp = this.mp
        `
		);

		expect(ctx.mp).not.toBe(2);
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
		const ctx = await evaluator.run(
			generator,
			`
            this.r = await Promise.resolve(2);
        `
		);

		expect(ctx.r).toBe(2);
	});

	test("can return anytime", async () => {
		const ctx = await evaluator.run(
			generator,
			`
            this.r = 1
            this.r = 2
            return
            this.r = 3
        `
		);

		expect(ctx.r).toBe(2);
	});

	test("will prefix obsidian comments", async () => {
		const token = "%%";

		const ctx = await evaluator.run(
			generator,
			`
            ${token}
            ${token} this.r = 1
            this.r = 2
            this.r = 3
            ${token}
        `
		);

		expect(ctx.r).toBe(3);
	});
});
