import Builder from "../base";

interface FileProp {
	name: string;
	basename: string;
	path: string;
	content: FileBuilder["content"];
}

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

	get file(): FileProp {
		return {
			name: this.ctx.view.file.name,
			basename: this.ctx.view.file.basename,
			path: this.ctx.view.file.path,
			content: this.content,
		};
	}

	async content() {
		return await this.app.vault.read(this.ctx.view.file);
	}
}
