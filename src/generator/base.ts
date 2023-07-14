import * as Obsidian from "obsidian";

import type { GeneratorBuilder } from "./generator";

export interface BuilderEvalContext {
	readonly app: Obsidian.App;
	readonly obsidian: typeof Obsidian;

	readonly mp: GeneratorBuilder;
	readonly ctx: {
		tfile: Obsidian.TFile;
		blockId: string;
		blockContent: string;
	};
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Builder extends BuilderEvalContext {}
class Builder {
	private ________props: Map<string, (...args: any[]) => any | void>;

	constructor() {
		this.________props = new Map();
	}

	// all of these will be overwritten by the generator

	protected addProperty(name: string, func: (...args: any[]) => any | void) {
		this.________props.set(name, func);
	}

	properties() {
		// copy the map
		return new Map(this.________props);
	}

	addContent(content: string) {}

	getContent() {
		return "";
	}

	async onBeforeEvaluation() {
		// called when a block is about to be evaluated
	}

	async onAfterEvaluation() {
		// called when a block has been evaluated
	}
}

export default Builder;
