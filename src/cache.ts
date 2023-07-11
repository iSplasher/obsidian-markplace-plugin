import { debounce, normalizePath, TFile, Vault } from "obsidian";

import { constant } from "./constants";
import { Block } from "./parser/parser";
import { MarkPlaceError } from "./utils/error";
import logger from "./utils/logger";

import type { MarkPlacePluginSettings } from "./components/settings";
const FILE_HEADER = `
THIS FILE IS AUTOGENERATED BY MARKPLACE. DO NOT EDIT THIS FILE DIRECTLY.
IT WILL BE OVERWRITTEN. IT IS OK TO DELETE THIS FILE TO RESET THE CACHE.

---
\`\`\`
`;

const FILE_FOOTER = `
\`\`\`
---
`;

enum CACHE_VERSION {
	V1 = "1.0.0",
}

const LATEST_CACHE_VERSION = CACHE_VERSION.V1;

const MAX_BLOCK_HISTORY = 10;

interface CacheDataBlock {
	history: string[]; // history of original content
}

type CacheData = {
	version: CACHE_VERSION;
	blocks: Record<string, CacheDataBlock>;
};

export default class Cache {
	private _normalizedPath: string;

	private data: CacheData;
	private loading: boolean;
	private loaded: boolean;

	private commit: (...args: Parameters<Cache["commitImmediate"]>) => void;

	constructor(public vault: Vault, private _path: string) {
		this.path = _path;
		this.loaded = false;
		this.loading = false;

		if (constant?.events) {
			constant.events.on("settingsChanged", this.onSettingsChanged, this);
		}

		this.data = {
			version: LATEST_CACHE_VERSION,
			blocks: {},
		};

		this.commit = debounce(this.commitImmediate.bind(this), 100);
	}

	get path() {
		return this._path;
	}

	set path(path: string) {
		this._path = path.trim();

		this._normalizedPath = normalizePath(this._path);

		const basename = this._normalizedPath.split("/").pop() ?? "";
		if (basename && !basename.includes(".")) {
			this._path += ".md";
			this._normalizedPath = normalizePath(this._path);
		}
	}

	get normalizedPath() {
		return this._normalizedPath;
	}

	async cacheBlocks(name: string, blocks: Block[]) {
		const cachedBlocks: CacheData["blocks"] = {};

		if (await this.init()) {
			const normName = normalizePath(name);
			const basename = normName.split("/").pop() ?? "";
			const keys = new Set<string>();

			for (const block of blocks) {
				const key = this.getBlockKey(normName, block);

				// duplicate block ids
				if (keys.has(key)) {
					logger.warnNotice(
						`Duplicate block id '${key}' detected in the note ${basename}.`,
						" Please make sure that all block ids are unique to allow caching to work properly."
					);

					// rmeove block from cache
					delete cachedBlocks[key];

					continue;
				}

				cachedBlocks[key] = this.stageBlock(key, block);
				keys.add(key);
			}

			Object.assign(this.data.blocks, cachedBlocks);

			this.commit();
		}

		return cachedBlocks;
	}

	private stageBlock(key: string, block: Block) {
		const d: CacheDataBlock = {
			history: [block.content],
		};

		// merge
		if (this.data.blocks[key]) {
			const prev = this.data.blocks[key].history;
			const prevLatest = prev[prev.length - 1];
			if (block.content !== prevLatest) {
				d.history = [...prev, block.content];
			} else {
				d.history = prev;
			}

			// only allows a certain amount of history
			if (d.history.length > MAX_BLOCK_HISTORY) {
				d.history = d.history.slice(
					d.history.length - MAX_BLOCK_HISTORY
				);
			}
		}

		return d;
	}

	private getBlockKey(name: string, block: Block) {
		return `${name}:${block.startTag.content.trim()}`;
	}

	private onSettingsChanged(
		settings: MarkPlacePluginSettings,
		oldSettings: MarkPlacePluginSettings
	) {
		if (this.path === oldSettings.cachePath) {
			this._path = settings.cachePath;
			this.loaded = false;
		}
	}

	private async init() {
		// if cache not enabled
		if (!constant?.settings?.cache) {
			logger.devWarnNotice("Cache is disabled");
			return false;
		}

		if (!this.path) {
			logger.warnNotice(
				"Cache file location is not set. Please set it in settings or disable caching."
			);
			return false;
		}

		// if file doesn't exist, create it
		if (!(await this.vault.adapter.exists(this.normalizedPath))) {
			try {
				await this.vault.create(this.normalizedPath, FILE_HEADER);
				logger.devInfoNotice("Created cache file", this.normalizedPath);
			} catch (error) {
				logger.warnNotice(
					"Failed to create cache file at",
					this.normalizedPath,
					"\n >",
					error?.message
				);
				return false;
			}
		} else {
			const file = this.vault.getAbstractFileByPath(this.normalizedPath);
			if (!(file instanceof TFile)) {
				logger.warnNotice(
					"Cache location points to a folder. Set the location to a file in settings or disable caching."
				);
				return false;
			}
			if (!this.loaded && !this.loading) {
				logger.devDebugNotice(
					"Cache file already exists. Skipping creation"
				);
			}
		}

		if (!this.loaded && !this.loading) {
			await this.load();
		}

		return true;
	}

	private async load() {
		this.loading = true;
		try {
			if (await this.init()) {
				const file = this.vault.getAbstractFileByPath(
					this.normalizedPath
				) as TFile;

				const content = await this.vault.read(file);

				const header = FILE_HEADER.trim();
				const footer = FILE_FOOTER.trim();

				let json = "";
				const headerIdx = content.indexOf(header);
				if (headerIdx >= 0) {
					json = content.slice(headerIdx + header.length).trim();
				}

				const footerIdx = json.lastIndexOf(footer);

				if (footerIdx >= 0) {
					json = json.slice(0, footerIdx).trim();
				}

				let loadedData: CacheData | undefined = undefined;

				let parsed: any = undefined;

				if (json) {
					try {
						parsed = JSON.parse(json);
					} catch (error) {
						logger.devWarnNotice(
							"Cache file has malformed JSON content:",
							error?.message
						);
						return;
					}
				}

				if (parsed) {
					loadedData = this.validate(parsed);
				}

				if (!loadedData) {
					logger.warnNotice(
						"Cache file content is not valid. Resetting cache."
					);
					return;
				}

				this.data = loadedData;
				this.loaded = true;
			}
		} finally {
			this.loading = false;
		}
	}

	private validate(parsed: any): CacheData | undefined {
		let version: CACHE_VERSION | undefined = undefined;
		let blocks: CacheData["blocks"] | undefined = undefined;

		// check if object
		if (typeof parsed === "object") {
			// get version
			if (parsed?.version) {
				// check if version is valid
				if (Object.values(CACHE_VERSION).includes(parsed.version)) {
					// check if upgradable
					if (parsed.version !== LATEST_CACHE_VERSION) {
						throw MarkPlaceError.notice(
							"Cache file version mismatch is not supported yet.",
							"Please delete or move the cache file to reset the cache."
						);
					} else {
						version = parsed.version;
					}
				}
			}

			// get blocks
			if (parsed?.blocks && typeof parsed.blocks === "object") {
				// check if blocks is valid
				if (
					Object.values(parsed.blocks).every((block: any) => {
						if (typeof block === "object") {
							return [
								Array.isArray(block?.history) &&
									block?.history.every(
										(s: any) => typeof s === "string"
									),
								// ... more checks here
							].every(Boolean);
						}
						return false;
					})
				) {
					blocks = parsed.blocks;
				}
			}
		}

		if (version && blocks) {
			return {
				version,
				blocks,
			};
		}

		return undefined;
	}

	private async commitImmediate() {
		this.loaded = true; // We can assume that the cache is loaded if we are committing
		if (await this.init()) {
			const file = this.vault.getAbstractFileByPath(
				this.normalizedPath
			) as TFile;
			const json = JSON.stringify(this.data, null, 4);
			const content = `${FILE_HEADER}${json}${FILE_FOOTER}`;
			await this.vault.process(file, (d) => content);
		}
	}
}
