class EventEmitter {
	callbacks: { [key: string]: ((...args: any[]) => any)[] } = {};

	on(event: string, cb: (...args: any[]) => any) {
		if (!this.callbacks[event]) this.callbacks[event] = [];
		this.callbacks[event].push(cb);
	}

	emit(event: string, ...data: any[]) {
		const cbs = this.callbacks[event];
		if (cbs) {
			cbs.forEach((cb) => cb(data));
		}
	}
}

/** Basic obsidian abstraction for any file or folder in a vault. */
export abstract class TAbstractFile {
	/**
	 * @public
	 */
	vault: Vault;
	/**
	 * @public
	 */
	path: string;
	/**
	 * @public
	 */
	name: string;
	/**
	 * @public
	 */
	parent: TFolder;
}

/** Tracks file created/modified time as well as file system size. */
export interface FileStats {
	/** @public */
	ctime: number;
	/** @public */
	mtime: number;
	/** @public */
	size: number;
}

/** A regular file in the vault. */
export class TFile extends TAbstractFile {
	stat: FileStats;
	basename: string;
	extension: string;
}

/** A folder in the vault. */
export class TFolder extends TAbstractFile {
	children: TAbstractFile[];

	isRoot(): boolean {
		return false;
	}
}

export class DataAdapter {
	exists = jest.fn();
}

export class Vault extends EventEmitter {
	getAbstractFileByPath = jest.fn();
	adapter = new DataAdapter();
	create = jest.fn();
	read = jest.fn();
	getFiles = jest.fn();
	process = jest.fn();

	trigger(name: string, ...data: any[]): void {
		this.emit(name, ...data);
	}
}

export class Component {
	registerEvent() {}
}

export class Notice {
	constructor(message: string, timeout: number) {}
}

export class App {
	vault = new Vault();

	constructor() {}
}


export class MarkdownView {
	containerEl = document.createElement("div");

	constructor() {}
}

export class Modal {
	app: any;

	constructor(app: any) {
		this.app = app;
	}

	onOpen() {}

	onClose() {}
}

export class PluginSettingTab {
	constructor(app: App, plugin: any) {}
}

export function normalizePath(path: string) {
	return "__normalized__/" + path;
}

export function debounce(fn: any, ...args: any[]) {
	return fn;
}