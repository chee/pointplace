import type {AutomergeUrl, DocHandle} from "@automerge/automerge-repo"
import type {DockviewApi} from "dockview-core"
import {createSignal, For, getOwner, onCleanup, runWithOwner} from "solid-js"
import NewDocumentMenu from "../../new-document-dropdown/new-document-dropdown.tsx"
import repo from "../../../repo/create.ts"
import type {
	DocumentBase,
	FolderDocument,
	ParentDocument,
	TextDocument,
} from "../../../repo/home.ts"
import {
	createDocumentProjection,
	createDocumentStore,
} from "../../../pages/app.tsx"
import {Button} from "@kobalte/core/button"
import "./document-list.css"

export default function DocumentList(props: {
	root: AutomergeUrl
	// todo remove direct access to dv, instead create wrapper api for common ops
	// todo or... i could create dockview api somewhere and export it?
	// todo or provide it with a context.
	// todo any of these seems fine
	// todo wrapper api prop seems most testable though
	dv: DockviewApi
}) {
	// todo some sort of wrapper that checks a doc is of the right type/matches schema?
	const rootHandle = repo.find<ParentDocument>(props.root)
	const [rootFolder, changeRootFolder] = createDocumentStore(() => rootHandle)
	const owner = getOwner()
	function add(url: AutomergeUrl) {
		const existing = props.dv.getPanel(url)
		if (existing) {
			existing.api.setActive()
		} else {
			props.dv.addPanel({
				id: url,
				component: "document",
				tabComponent: "document",
			})
		}
	}

	const [active, setActive] = createSignal<AutomergeUrl | undefined>(
		props.dv.activePanel?.id as AutomergeUrl
	)

	const onactive = props.dv.onDidActivePanelChange(panel => {
		setActive(panel?.id as AutomergeUrl)
	})

	const [panels, setPanels] = createSignal<AutomergeUrl[]>(
		(props.dv.panels.map(panel => panel.id) as AutomergeUrl[]) ?? []
	)

	const onlayout = props.dv.onDidLayoutChange(() => {
		setPanels(props.dv.panels.map(panel => panel.id) as AutomergeUrl[])
	})

	onCleanup(() => {
		onactive.dispose()
		onlayout.dispose()
	})

	return (
		<div class="sidebar-widget">
			<header class="sidebar-widget__header">
				<span>documents</span>
				<div class="sidebar-widget__header-actions">
					<NewDocumentMenu
						creators={[
							{label: "folder", id: "folder"},
							{
								label: "plain text",
								id: "text",
							},
							{
								label: "rich text",
								id: "richtext",
							},
							{label: "voice note", id: "sound"},
							{label: "canvas", id: "canvas"},
						]}
						create={id => {
							let handle: DocHandle<DocumentBase>
							if (id == "text") {
								handle = repo.create({
									name: "new text document",
									type: "text",
									text: "i am a new text document",
								})
							} else if (id == "folder") {
								handle = repo.create({
									name: "new folder",
									type: "folder",
									children: [],
								})
							}
							if (handle) {
								runWithOwner(owner, () => add(handle.url))
								changeRootFolder(doc => doc.children.push(handle.url))
							}
						}}
						importers={[
							{label: "from file", id: "file"},
							{label: "from URL", id: "url"},
						]}
						import={id => {
							console.info(`she wants to import from ${id}`)
						}}
					/>
				</div>
			</header>
			<div class="sidebar-widget__content">
				<ul class="document-list">
					<For each={rootFolder.children}>
						{url => {
							const handle = repo.find<TextDocument>(url)
							const store = createDocumentProjection(() => handle)
							const pressed = () =>
								active() == url
									? "true"
									: panels().includes(url)
									? "mixed"
									: "false"

							return (
								<li>
									<Button
										class="document-list__button"
										onclick={() => runWithOwner(owner, () => add(url))}
										aria-pressed={pressed()}>
										{store.name ?? url}
									</Button>
								</li>
							)
						}}
					</For>
				</ul>
			</div>
		</div>
	)
}