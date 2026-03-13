# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.12.7 create --template minimal --types ts --add prettier eslint vitest="usages:component,unit" playwright tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:auto" devtools-json --install npm NAA-Software-Experimentalist-v2
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Cosmos DB Integration

This project includes a small server endpoint that can persist isotope entries to **Azure Cosmos DB**.

### How to enable

1. Copy `.env.example` to `.env`.
2. Fill in `COSMOS_CONNECTION_STRING` with your Azure Cosmos DB connection string.
3. Optionally adjust `COSMOS_DATABASE` and `COSMOS_CONTAINER`.
4. Enable remote persistence:

```sh
VITE_USE_COSMOS=true
```

5. Restart the dev server.

The isotope form will then post entries to `/api/isotopes`, which stores them in Cosmos DB.
