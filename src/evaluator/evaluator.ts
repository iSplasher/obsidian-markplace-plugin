import Generator from "../generator/generator";
import logger from "../utils/logger";

interface EvaluatorLocals {
	mp: string;
	[key: string]: string;
}

export default class Evaluator {
	private locals: EvaluatorLocals;
	private userContext: Record<string, any>;

	constructor() {
		this.locals = {
			app: "undefined",
			mp: "this.mp",
		};

		this.userContext = {};
	}

	private scopedEval(
		context: Record<string, any>,
		locals: Record<string, string>,
		code: string
	) {
		const AsyncFunction = async function () {}.constructor;

		let local = "";

		Object.keys(locals).forEach((key) => {
			local += `\nconst ${key} = ${locals[key]};\n`;
		});

		const f = AsyncFunction(`"use strict"; ${local} ${code}`).bind(context);
		return f as () => Promise<void>;
	}
	async run(generator: Generator, code: string) {
		const builder = generator.builder();

		const preCtx = builder.context;
		const context = Object.assign({}, this.userContext, preCtx);

		const scope = this.scopedEval(context, this.locals, code);

		try {
			await generator.onEvaluation(
				"before",
				builder.builder,
				builder.contexts
			);
			await scope();
			await generator.onEvaluation(
				"after",
				builder.builder,
				builder.contexts
			);
		} catch (e) {
			logger.devWarnNotice("Error while evaluating code", e);
			// wrap this in custom error
			throw e;
		}

		this.userContext = context;

		return context;
	}
}
