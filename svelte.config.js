import azure from 'svelte-adapter-azure-swa';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use the Azure Static Web Apps adapter to output a build/ folder with
		// both static assets and an Azure Function for SSR.
		//
		// Azure Static Web Apps reserves the `/api/*` prefix for its own runtime.
		// Set `allowReservedSwaRoutes: true` to allow SvelteKit to keep routes under
		// `/api/` (e.g., `/api/cosmos`) and forward them to the SvelteKit server
		// function instead of returning 404.
		adapter: azure({ allowReservedSwaRoutes: true })
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
