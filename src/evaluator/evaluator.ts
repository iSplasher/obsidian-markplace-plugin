import Generator from "../render/generator";
import { dedent } from "../utils/misc";

const PREFIX_COMMENT_TOKEN = "%%";

interface EvaluatorContext {
	mp: Generator;
}

interface EvaluatorLocals {
	mp: string;
	[key: string]: string;
}

export default class Evaluator {
	private locals: EvaluatorLocals;
	private userContext: Record<string, any>;

	constructor() {
		this.locals = {
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

		let local = dedent`
            const app = undefined;
        `;

		Object.keys(locals).forEach((key) => {
			local += `\nconst ${key} = ${locals[key]};\n`;
		});

		const f = AsyncFunction(`"use strict"; ${local} ${code}`).bind(context);
		return f as () => Promise<void>;
	}

	private createContext(ctx: { mp: Generator }): EvaluatorContext {
		return {
			...ctx,
		};
	}

	private prefixComment(code: string) {
		return code
			.split("\n")
			.map((line) => {
				if (line.trim().startsWith(PREFIX_COMMENT_TOKEN)) {
					return `//${line}}`;
				}
				return line;
			})
			.join("\n");
	}

	async run(generator: Generator, code: string) {
		const preCtx = this.createContext({ mp: generator });
		const context = Object.assign({}, this.userContext, preCtx);

		const prefixedCode = this.prefixComment(code);
		const scope = this.scopedEval(context, this.locals, prefixedCode);

		try {
			await scope();
		} catch (e) {
			// wrap this in custom error
			throw e;
		}

		this.userContext = context;

		return context;
	}
}
