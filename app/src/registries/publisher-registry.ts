import {type Repo} from "@automerge/automerge-repo"
import {createContext, useContext} from "solid-js"
import {Registry} from "./registry.ts"
import {err, ok, type Result} from "true-myth/result"
import type {ContentTypeRegistry} from "./content-type-registry.ts"
import {Automerge} from "@automerge/automerge-repo/slim"
import {
	Editor,
	Publisher,
	StoredPublisher,
	type Entry,
	type StoredEditor,
} from "@pointplace/schemas"
import repo from "../repo/create.ts"
import type {Home} from "../repo/home.ts"
import homeURL from "../repo/home.ts"

export class PublisherRegistry extends Registry<StoredPublisher, Publisher> {
	private contentTypeRegistry: ContentTypeRegistry

	constructor({
		repo,
		contentTypeRegistry,
	}: {
		repo: Repo
		contentTypeRegistry: ContentTypeRegistry
	}) {
		super({
			repo,
			type: "publisher",
			storedSchema: StoredPublisher,
			schema: Publisher,
		})
		this.contentTypeRegistry = contentTypeRegistry
		this.register(compileToEditor)
		this.register(exportAutomerge)
	}

	*publishers(entry: Entry) {
		const seen = new Set<Publisher>()
		for (const publisher of Object.values(this.records)) {
			if (publisher.contentTypes.includes(entry.contentType)) {
				seen.add(publisher)
				yield publisher
			}
		}

		const entryType = this.contentTypeRegistry.get(entry.contentType)
		if (entryType.isOk && entryType.value.conformsTo) {
			for (const publisher of Object.values(this.records)) {
				if (
					Array.isArray(publisher.contentTypes) &&
					publisher.contentTypes.some(type =>
						entryType.value.conformsTo?.includes(type)
					) &&
					!seen.has(publisher)
				) {
					seen.add(publisher)
					yield publisher
				}
			}
		}

		for (const publisher of Object.values(this.records)) {
			if (publisher.contentTypes === "*") {
				if (!seen.has(publisher)) {
					seen.add(publisher)
					yield publisher
				}
			}
		}
	}

	get(id: string): Result<Publisher, Error> {
		const publisher = this.records[id]
		return publisher
			? ok(publisher)
			: err(new Error(`publisher not found: ${id}`))
	}
}

export const PublisherRegistryContext = createContext<PublisherRegistry>()

export function usePublisherRegistry() {
	const value = useContext(PublisherRegistryContext)
	if (!value) {
		throw new Error("this needs to be used within a PublisherRegistryContext")
	}
	return value
}

const exportAutomerge: Publisher = {
	id: "export-automerge",
	displayName: "Automerge File",
	contentTypes: "*",
	category: "export",
	publish: async ({handle, entry}) => {
		const doc = handle.doc()
		const a = document.createElement("a")
		a.download = `${entry.name}.automerge`
		a.href = URL.createObjectURL(new Blob([Automerge.save(doc)]))
		a.click()
	},
}

const compileToEditor: Publisher = {
	id: "compile-to-editor",
	displayName: "Compile to Editor",
	contentTypes: ["public.code"],
	category: "reïmport",
	publish: async ({handle, entry}) => {
		const file = handle.doc()
		return compile(file.text)
			.then(code => {
				const bytes = new TextEncoder().encode(code)
				const blob = new Blob([bytes], {
					type: "application/javascript",
				})
				const blobURL = URL.createObjectURL(blob)
				return import(/* @vite-ignore */ blobURL).then(mod => ({
					bytes,
					mod,
				}))
			})
			.then(async result => {
				const parsed = await Editor["~standard"].validate(result.mod)
				if (parsed.issues) {
					console.error(parsed.issues)
					throw new Error("document doesn't look like an editor")
				}
				const editor = {...(result.mod as StoredEditor)}
				delete (editor as Partial<Editor<unknown>>).render
				editor.bytes = result.bytes
				editor.type = "editor"

				if (file.storedURL) {
					return repo
						.find<StoredEditor>(file.storedURL)
						.then(async handle => {
							handle.change(doc => {
								doc.bytes = editor.bytes
							})
							const homeHandle = await repo.findClassic<Home>(homeURL())
							homeHandle.change(home => {
								if (![...home.editors].includes(handle.url)) {
									home.editors.push(handle.url)
								}
							})
						})
				}

				const url = repo.create(editor).url
				handle.change(file => {
					file.storedURL = url
				})
				const homeHandle = await repo.findClassic<Home>(homeURL())
				homeHandle.change(home => {
					if (![...home.editors].includes(handle.url)) {
						home.editors.push(handle.url)
					}
				})
			})
	},
}

const esbuild = await import("esbuild-wasm")
const wasm = await import("esbuild-wasm/esbuild.wasm?url")

await esbuild.initialize({
	wasmURL: wasm.default,
})

async function compile(text: string) {
	const result = await esbuild.transform(text, {
		loader: "ts",
		target: "esnext",
	})
	return result.code
}
