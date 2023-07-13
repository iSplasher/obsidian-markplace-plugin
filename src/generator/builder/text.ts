import Builder from "../base";

export default class TextBuilder extends Builder {
	constructor() {
		super();

		this.addProperty("text", this.text);
	}

	text(text: string) {
		this.addContent(text);
	}
}
