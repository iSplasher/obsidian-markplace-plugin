import * as Obsidian from 'obsidian';

import { constant } from '../constants';
import { Block } from '../parser/parser';
import logger from '../utils/logger';
import Builder, { BuilderEvalContext } from './base';
import FileBuilder from './builder/file';
import TextBuilder from './builder/text';

export interface GeneratorBuilder {
	[key: string]: any;
}

export default class Generator {
	private content: string;
	private baseBuilder: Builder;
	private builders: Builder[];

	private overrides: Record<
		string,
		((...args: any[]) => any | void) | undefined
	>;
	private fieldOverrides: Record<string, () => any>;

	constructor(readonly file: Obsidian.TFile, readonly block: Block) {
		this.content = "";
		this.baseBuilder = new Builder();
		this.builders = [];

		this.fieldOverrides = {};

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

		const overriddenFields = Object.keys(this.fieldOverrides);
		if (
			!Object.getOwnPropertyNames(this.baseBuilder).every(
				(k) => k.startsWith("________") || overriddenFields.includes(k)
			)
		) {
			throw new Error(
				"Class fields in base Builder class should start with '________' or be overridden"
			);
		}
	}

	builtinBuilders() {
		return [new FileBuilder(), new TextBuilder()];
	}

	registerBuilder(builder: Builder) {
		this.builders.push(builder);
	}

	builder() {
		const genBuilder: GeneratorBuilder = {};
		const contexts: Map<
			typeof Builder.prototype,
			Record<string, any>
		> = new Map();

		const context: BuilderEvalContext = {
			obsidian: Obsidian,
			app: constant?.app as Obsidian.App,
			mp: genBuilder,
			ctx: {
				tfile: this.file,
				blockId: this.block.id,
				blockContent: this.block.preContent,
			},
		};

		for (const builder of this.builders) {
			const baseContext = {};

			// add to mp object

			for (const [name, func] of Builder.prototype.properties.call(
				builder
			)) {
				if (func?.get) {
					// this is a an accessor
					const d = {
						...func,
						get: func?.get
							? () => func.get.call(baseContext)
							: undefined,
						set: func?.set
							? (...args: any[]) =>
									func.set.call(baseContext, ...args)
							: undefined,
					};

					Object.defineProperty(genBuilder, name, d);
				} else {
					genBuilder[name] = func.bind(baseContext);
				}
			}

			// prepare builder context

			const builderContructorContext = {} as Record<string, any>;
			const builderMethodsContext = {} as Record<string, () => any>;

			const basePropNames = Object.getOwnPropertyNames(this.baseBuilder);

			for (const key of Object.getOwnPropertyNames(builder)) {
				const v = builder[key as keyof Builder];
				// filter out base builder's fields
				if (basePropNames.includes(key)) {
					continue;
				}

				builderContructorContext[key] = v;
			}

			const prototype = Object.getPrototypeOf(builder);

			const baseProtoPropNames = Object.getOwnPropertyNames(
				Builder.prototype
			);

			const baseDescriptors = Object.getOwnPropertyDescriptors(prototype);

			const getterDescriptors: Record<string, PropertyDescriptor> = {};

			for (const key of Object.getOwnPropertyNames(prototype)) {
				// getter descripters get special treatment
				if (baseDescriptors[key]?.get) {
					getterDescriptors[key] = baseDescriptors[key];
					continue;
				}

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
						// @ts-ignore
						builder[k].bind(baseContext);
				} else {
					overrides[k] = overrides[k]!.bind(baseContext);
				}
			}

			const fieldOverrides = Object.assign({}, this.fieldOverrides);

			for (const k of Object.keys(fieldOverrides)) {
				fieldOverrides[k] = fieldOverrides[k]();
			}

			Object.assign(
				baseContext,
				builderMethodsContext,
				builderContructorContext,
				context,
				fieldOverrides,
				overrides
			);

			const contextKeys = Object.keys(baseContext);
			// assign accessors
			for (const [name, descriptor] of Object.entries(
				getterDescriptors
			)) {
				if (contextKeys.includes(name)) {
					continue;
				}

				const d = {
					...descriptor,
					get: descriptor?.get
						? descriptor.get.bind(baseContext)
						: undefined,
					set: descriptor?.set
						? descriptor.set.bind(baseContext)
						: undefined,
				};

				Object.defineProperty(baseContext, name, d);
			}

			contexts.set(prototype, baseContext);
		}

		return {
			builder: genBuilder,
			contexts: contexts,
			context,
		};
	}

	compile() {
		return this.content;
	}

	async onEvaluation(
		type: "before" | "after",
		builder: GeneratorBuilder,
		contexts: Map<typeof Builder.prototype, Record<string, any>>
	) {
		let builderProto: typeof Builder.prototype | undefined = undefined;

		const funcName =
			type === "before" ? "onBeforeEvaluation" : "onAfterEvaluation";

		try {
			for (const [proto, ctx] of contexts) {
				builderProto = proto;

				await proto[funcName].call(ctx, builder);
			}
		} catch (e) {
			logger.devWarnNotice(
				// @ts-ignore
				`An error occured in ${builderProto?.name} ${funcName}()}`,
				e?.message
			);
			throw e;
		}
	}

	private addContent(content: string) {
		this.content += content;
	}

	private getContent() {
		return this.content;
	}
}
