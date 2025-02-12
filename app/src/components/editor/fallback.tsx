import type {Entry} from "../../documents/entry.ts"
import "./fallback.css"

export default function EditorFallback(props: {
	entry: Entry
	editor: unknown
	fileHandle: unknown
}) {
	const json = () => JSON.stringify(props.entry, null, "\t")
	return (
		<div class="editor-fallback">
			<p>
				sorry, i can't display this
				<code>{" " + props.entry?.contentType}</code>...
			</p>
			{!props.editor && <p>because there's no Editor</p>}
			{!props.fileHandle && <p>because i didn't find the file</p>}
			<br />
			<p>debug info:</p>
			<pre style={{background: "black", color: "lime"}}>{json()}</pre>
		</div>
	)
}
