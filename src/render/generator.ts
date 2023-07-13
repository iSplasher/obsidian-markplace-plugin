export default class Generator {
	content: string;

	constructor() {
		this.content = "generated";
	}

	text(text: string) {
		this.content = text;
	}

	compile() {
		return this.content;
	}
}
