import Builder from "./base";
import TextBuilder from "./builder/text";

export interface GeneratorBuilder {
	[key: string]: (...args: any[]) => any;
}

export default class Generator {
	private content: string;
	private baseBuilder: Builder;
	private builders: Builder[];

	private overrides: Record<string, ((...args: any[]) => any) | undefined>;

	constructor() {
		this.content = "";
		this.baseBuilder = new Builder();
		this.builders = [];

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const cls = this;
		// undefined means the base builder's own function will be used
		this.overrides = {
			onBeforeEvaluation: undefined,
			onAfterEvaluation: undefined,
			addProperty: () => undefined,
			properties: () => new Map(),
			addContent: (...args: any[]) => cls.addContent.call(this, ...args),
			getContent: (...args: any[]) => cls.getContent.call(this, ...args),
		};

		const prototype = Builder.prototype;

		if (Object.keys(this.overrides).some((k) => !(k in prototype))) {
			throw new Error("Generator overrides must be in Builder.prototype");
		}

		if (
			!Object.getOwnPropertyNames(prototype).every((k) =>
				k === "constructor" ? true : k in this.overrides
			)
		) {
			throw new Error(
				"Missing generator overrides found in Builder.prototype"
			);
		}

		if (
			!Object.getOwnPropertyNames(this.baseBuilder).every((k) =>
				k.startsWith("________")
			)
		) {
			throw new Error(
				"Class fields in base Builder class should start with '________'"
			);
		}
	}

	builtinBuilders() {
		return [new TextBuilder()];
	}

	registerBuilder(builder: Builder) {
		this.builders.push(builder);
	}

	builder() {
		const genBuilder: GeneratorBuilder = {};

		for (const builder of this.builders) {
			for (const [name, func] of Builder.prototype.properties.call(
				builder
			)) {
				const builderContructorContext = {} as Record<string, any>;
				const builderMethodsContext = {} as Record<string, () => any>;

				const basePropNames = Object.getOwnPropertyNames(
					this.baseBuilder
				);

				for (const key of Object.getOwnPropertyNames(builder)) {
					const v = builder[key as keyof Builder];
					// filter out base builder's fields
					if (basePropNames.includes(key)) {
						continue;
					}

					builderContructorContext[key] = v;
				}

				const baseContext = {};

				const prototype = Object.getPrototypeOf(builder);

				const baseProtoPropNames = Object.getOwnPropertyNames(
					Builder.prototype
				);

				for (const key of Object.getOwnPropertyNames(prototype)) {
					const p = prototype[key];
					// filter out base builder's proto props
					if (baseProtoPropNames.includes(key)) {
						continue;
					}

					builderMethodsContext[key] = p.bind(baseContext);
				}

				const overrides = Object.assign({}, this.overrides);

				for (const k of Object.keys(overrides)) {
					if (overrides[k] === undefined) {
						// use builder's own function
						overrides[k] =
							builder[k as keyof Builder].bind(baseContext);
					} else {
						overrides[k] = overrides[k]!.bind(baseContext);
					}
				}

				Object.assign(
					baseContext,
					builderMethodsContext,
					builderContructorContext,
					overrides
				);

				genBuilder[name] = func.bind(baseContext);
			}
		}

		return genBuilder;
	}

	compile() {
		return this.content;
	}

	onBeforeEvaluation(builder: GeneratorBuilder) {}

	onAfterEvaluation(builder: GeneratorBuilder) {}

	private addContent(content: string) {
		this.content += content;
	}

	private getContent() {
		return this.content;
	}
}
