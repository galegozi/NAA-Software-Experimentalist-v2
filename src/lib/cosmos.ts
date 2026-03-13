import { CosmosClient } from '@azure/cosmos';

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseId = process.env.COSMOS_DATABASE || 'Isotopes';
const containerId = process.env.COSMOS_CONTAINER || 'Isotopes';

let containerInstance: Container | null = null;

export function getCosmosContainer(): Container {
	if (!connectionString) {
		throw new Error(
			'COSMOS_CONNECTION_STRING is not configured. Set the environment variable and restart the server.'
		);
	}

	if (!containerInstance) {
		const client = new CosmosClient(connectionString);
		containerInstance = client.database(databaseId).container(containerId);
	}

	return containerInstance;
}
