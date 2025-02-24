import type {PluginAPI} from "@pointplace/types"
import activateCodemirror from "@pointplace/codemirror"
import githubMarkdownPreview from ":/views/github-markdown-preview.tsx"
import automergeDocEditor from ":/views/editors/automerge-doc-editor.tsx"

export default function registerBaseViews(api: PluginAPI) {
	// todo export plugins from these instead
	activateCodemirror(api)
	api.registerView(githubMarkdownPreview)
	api.registerView(automergeDocEditor)
}
