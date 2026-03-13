import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getCosmosContainer } from '$lib/cosmos';

export async function GET() {
	try {
		const container = getCosmosContainer();
		const { resources } = await container.items.readAll().fetchAll();
		return json(resources);
	} catch (error) {
		console.error('Cosmos GET error', error);
		return json(
			{ error: 'Failed to read isotopes from Cosmos DB. Is configuration correct?' },
			{ status: 500 }
		);
	}
}

function buildId(elementShortName: string, massNumber: number, suffix: string) {
	return `${elementShortName.trim().toLowerCase()}::${massNumber}::${suffix.trim().toLowerCase()}`;
}

export async function POST({ request }: RequestEvent) {
	const body = await request.json();
	const { elementName, elementShortName, massNumber, suffix, halfLife, energy } = body as {
		elementName: string;
		elementShortName: string;
		massNumber: number;
		suffix: string;
		halfLife: number;
		energy: number;
	};

	if (
		!elementName ||
		!elementShortName ||
		typeof massNumber !== 'number' ||
		Number.isNaN(massNumber)
	) {
		return json(
			{ error: 'elementName, elementShortName, and massNumber are required' },
			{ status: 400 }
		);
	}

	if (typeof halfLife !== 'number' || Number.isNaN(halfLife) || halfLife <= 0) {
		return json({ error: 'halfLife must be a positive number' }, { status: 400 });
	}

	if (typeof energy !== 'number' || Number.isNaN(energy) || energy <= 0) {
		return json({ error: 'energy must be a positive number' }, { status: 400 });
	}

	try {
		const container = getCosmosContainer();
		const id = buildId(elementShortName, massNumber, suffix);

		// Try to read an existing item (itemId == partitionKey here)
		let existing;
		try {
			const { resource } = await container.item(id, id).read();
			existing = resource;
		} catch {
			existing = null;
		}

		const updated = existing
			? {
				...existing,
				elementName: elementName.trim(),
				massNumber,
				suffix: suffix.trim(),
				halfLife,
				characteristicEnergies: Array.isArray(existing.characteristicEnergies)
					? Array.from(new Set([...existing.characteristicEnergies, energy]))
					: [energy]
			}
			: {
				id,
				partitionKey: id,
				elementName: elementName.trim(),
				elementShortName: elementShortName.trim(),
				massNumber,
				suffix: suffix.trim(),
				halfLife,
				characteristicEnergies: [energy]
			};

		const { resource } = await container.items.upsert(updated);
		return json(resource);
	} catch (error) {
		console.error('Cosmos POST error', error);
		return json(
			{ error: 'Failed to upsert isotope in Cosmos DB. Is configuration correct?' },
			{ status: 500 }
		);
	}
}
