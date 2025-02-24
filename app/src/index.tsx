/* @refresh reload */
import "./styles/preflight.css"
import "./styles/font-face.css"
import "./styles/global.css"
import "./styles/palette.css"
import "./styles/animations.css"

import {render} from "solid-js/web"
import App from "./pages/app.tsx"
import {attachDevtoolsOverlay} from "@solid-devtools/overlay"
import registerServiceWorker from "./register-service-worker.ts"
import "./repo/api.ts"

declare global {
	interface Window {
		log: ReturnType<typeof import("debug")>
	}
}

if (import.meta.env.DEV) {
	attachDevtoolsOverlay()
} else {
	registerServiceWorker()
}

const root = document.getElementById("root")!

import {ViewRegistry, ViewRegistryContext} from "./registries/view-registry.ts"

import {
	SourceRegistry,
	SourceRegistryContext,
} from "./registries/source-registry.ts"

import repo from "./repo/create.ts"
import {RepoContext} from "solid-automerge"
import {createRoot} from "solid-js"
import {SinkRegistry, SinkRegistryContext} from "./registries/sink-registry.ts"
import PluginAPI, {PluginAPIContext} from "./plugins/plugin-api.ts"

createRoot(() => {
	const sinkRegistry = new SinkRegistry({repo})
	const sourceRegistry = new SourceRegistry({repo})
	const viewRegistry = new ViewRegistry({repo})
	const pluginAPI = new PluginAPI({
		viewRegistry,
		sourceRegistry,
		sinkRegistry,
	})
	window.pluginAPI = pluginAPI

	render(
		() => (
			<SinkRegistryContext.Provider value={sinkRegistry}>
				<SourceRegistryContext.Provider value={sourceRegistry}>
					<ViewRegistryContext.Provider value={viewRegistry}>
						<RepoContext.Provider value={repo}>
							<PluginAPIContext.Provider value={pluginAPI}>
								<App />
							</PluginAPIContext.Provider>
						</RepoContext.Provider>
					</ViewRegistryContext.Provider>
				</SourceRegistryContext.Provider>
			</SinkRegistryContext.Provider>
		),
		root
	)
})
