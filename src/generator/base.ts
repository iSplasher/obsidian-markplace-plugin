export default class Builder {
	private ________props: Map<string, (...args: any[]) => any>;

	constructor() {
		this.________props = new Map();
	}

	// all of these will be overwritten by the generator

	protected addProperty(name: string, func: (...args: any[]) => any) {
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

	onBeforeEvaluation() {
		// called when a block is about to be evaluated
	}

	onAfterEvaluation() {
		// called when a block has been evaluated
	}
}
