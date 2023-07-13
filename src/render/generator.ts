export default class Generator {
	constructor() {
		this.content = "generated";
	}

	test(text: string) {
		this.content = text;
	}

	compile() {
		return this.content;
	}
}
