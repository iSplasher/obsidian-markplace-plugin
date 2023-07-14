import Builder from "../base";

export default class TextBuilder extends Builder {
	constructor() {
		super();

		this.addProperty("text", this.text);
		this.addProperty("newline", this.newline);
		this.addProperty("newLine", this.newline);
	}

	text(text: string) {
		this.addContent(text);
	}

	newline() {
		this.addContent("\n");
	}
}
