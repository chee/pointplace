import {type Repo} from "@automerge/automerge-repo"
import {createContext, useContext} from "solid-js"
import {err, ok, type Result} from "true-myth/result"
import type {Entry} from "../../documents/entry.ts"
import {Registry} from "../registry.ts"
import {StoredEditor, Editor} from "./editor-schema.ts"
import {useContentTypeRegistry} from "../content-type/content-type-registry.ts"

export class EditorRegistry extends Registry<StoredEditor, Editor> {
	constructor({repo}: {repo: Repo}) {
		super({repo, storedSchema: StoredEditor, schema: Editor, name: "editor"})
	}

	/*
	 * a way to add these:
	 * 1. cli: build the bundle
	 * 2. cli: cat bundle.js|base64 -w0|pbcopy
	 * 3. browser: repo.find(url).change(doc => doc.bytes = Uint8Array.fromBas64(`⌘+v`))<RET>
	 */

	// this yields in three steps to allow for more specific matches to be yielded first
	*editors(entry: Entry) {
		const seen = new Set<Editor>()
		for (const editor of Object.values(this.records)) {
			if (typeof editor.contentTypes == "string") continue
			if (editor.contentTypes.includes(entry.contentType)) {
				seen.add(editor)
				yield editor
			}
		}

		const contentTypes = useContentTypeRegistry()

		const entryType = contentTypes.get(entry.contentType)

		if (entryType.isOk && entryType.value.conformsTo) {
			for (const editor of Object.values(this.records)) {
				if (typeof editor.contentTypes == "string") continue
				if (
					editor.contentTypes.some(type =>
						entryType.value.conformsTo?.includes(type)
					) &&
					!seen.has(editor)
				) {
					seen.add(editor)
					yield editor
				}
			}
		}
		for (const editor of Object.values(this.records)) {
			if (editor.contentTypes == "*" && !seen.has(editor)) {
				seen.add(editor)
				yield editor
			}
		}
	}

	get(id: string): Result<Editor, Error> {
		const editor = this.records[id]
		return editor ? ok(editor) : err(new Error(`editor not found: ${id}`))
	}
}

export const EditorRegistryContext = createContext<EditorRegistry>()

export function useEditorRegistry() {
	const value = useContext(EditorRegistryContext)
	if (!value) {
		throw new Error("this needs to be used within a EditorRegistryContext")
	}
	return value
}
