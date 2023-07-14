import Builder from "../base";

export default class FileBuilder extends Builder {
	constructor() {
		super();

		this.addProperty(
			"file",
			Object.getOwnPropertyDescriptor(
				FileBuilder.prototype,
				"file"
			) as () => any
		);
	}

	get file() {
		return {
			name: this.ctx.tfile.name,
			path: this.ctx.tfile.path,
			content: this.content,
		};
	}

	async content() {
		return await this.app.vault.read(this.ctx.tfile);
	}
}
