import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';

export interface Isotope {
	// Full element name, e.g. "Uranium"
	elementName: string;
	// Short element symbol, e.g. "U"
	elementShortName: string;
	// Mass number, e.g. 235
	massNumber: number;
	// State suffix, e.g. "m" for metastable
	suffix: string;
	// Half life in seconds (or user-provided units)
	halfLife: number;
	// List of characteristic energies (keV, MeV, etc.)
	characteristicEnergies: number[];
}

// Stable in-browser persistence key
const STORAGE_KEY = 'naa-isotopes-v1';

// Set VITE_USE_COSMOS=true to persist to Cosmos DB via the `/api/isotopes` endpoint.
const useRemote = import.meta.env.VITE_USE_COSMOS === 'true';

function parseMassSuffix(value: unknown): { massNumber: number; suffix: string } {
	if (typeof value !== 'string') {
		return { massNumber: NaN, suffix: '' };
	}

	// Accept values like "87m", "235", "235m"
	const match = value.trim().match(/^\s*(\d+)([a-zA-Z]*)\s*$/);
	if (!match) {
		return { massNumber: NaN, suffix: value.trim() };
	}

	return { massNumber: Number(match[1]), suffix: match[2] ?? '' };
}

function normalizeIsotope(raw: unknown): Isotope | null {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

	const value = raw as Record<string, unknown>;
	const elementName = typeof value.elementName === 'string' ? value.elementName : '';
	const elementShortName = typeof value.elementShortName === 'string' ? value.elementShortName : '';
	const halfLife = typeof value.halfLife === 'number' ? value.halfLife : NaN;
	const characteristicEnergies = Array.isArray(value.characteristicEnergies)
		? value.characteristicEnergies.filter((n) => typeof n === 'number')
		: [];

	let massNumber = typeof raw.massNumber === 'number' ? raw.massNumber : NaN;
	let suffix = typeof raw.suffix === 'string' ? raw.suffix : '';

	// Migrate older records where "suffix" contained the mass number (e.g. "87m").
	if (Number.isNaN(massNumber) && suffix) {
		const parsed = parseMassSuffix(suffix);
		massNumber = parsed.massNumber;
		suffix = parsed.suffix;
	}

	if (!elementName || !elementShortName || Number.isNaN(massNumber)) return null;

	return {
		elementName: elementName.trim(),
		elementShortName: elementShortName.trim(),
		massNumber,
		suffix: suffix.trim(),
		halfLife: Number.isNaN(halfLife) ? 0 : halfLife,
		characteristicEnergies
	};
}

function loadFromStorage(): Isotope[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(normalizeIsotope).filter((iso): iso is Isotope => iso !== null);
	} catch {
		return [];
	}
}

function saveToStorage(isotopes: Isotope[]) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(isotopes));
	} catch {
		// ignore
	}
}

function makeKey({
	elementShortName,
	massNumber,
	suffix
}: Pick<Isotope, 'elementShortName' | 'massNumber' | 'suffix'>) {
	return `${elementShortName.trim().toLowerCase()}::${massNumber}::${suffix.trim().toLowerCase()}`;
}

async function fetchRemoteIsotopes(): Promise<Isotope[]> {
	const res = await fetch('/api/isotopes');
	if (!res.ok) {
		throw new Error('Failed to fetch isotopes from server');
	}
	return (await res.json()) as Isotope[];
}

async function postRemoteIsotope(newIsotope: {
	elementName: string;
	elementShortName: string;
	massNumber: number;
	suffix: string;
	halfLife: number;
	energy: number;
}): Promise<Isotope[]> {
	const res = await fetch('/api/isotopes', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify(newIsotope)
	});
	if (!res.ok) {
		throw new Error('Failed to update isotope on server');
	}
	return (await res.json()) as Isotope[];
}

function createIsotopeStore() {
	const { subscribe, set, update } = writable<Isotope[]>([]);

	if (browser) {
		if (useRemote) {
			fetchRemoteIsotopes()
				.then(set)
				.catch(() => {
					// Fall back to local storage if remote fails
					set(loadFromStorage());
				});
		} else {
			set(loadFromStorage());
		}
	}

	return {
		subscribe,
		addEnergy: async (newIsotope: {
			elementName: string;
			elementShortName: string;
			massNumber: number;
			suffix: string;
			halfLife: number;
			energy: number;
		}) => {
			if (useRemote && browser) {
				try {
					const updated = await postRemoteIsotope(newIsotope);
					set(updated);
					return;
				} catch {
					// fall back to local storage if remote fails
				}
			}

			update((items) => {
				const key = makeKey(newIsotope);
				const existing = items.find((i) => makeKey(i) === key);
				if (!existing) {
					const added: Isotope = {
						elementName: newIsotope.elementName.trim(),
						elementShortName: newIsotope.elementShortName.trim(),
						massNumber: newIsotope.massNumber,
						suffix: newIsotope.suffix.trim(),
						halfLife: newIsotope.halfLife,
						characteristicEnergies: [newIsotope.energy]
					};
					const next = [...items, added];
					saveToStorage(next);
					return next;
				}

				// If isotope already exists, append energy if new.
				const hasEnergy = existing.characteristicEnergies.includes(newIsotope.energy);
				if (!hasEnergy) {
					existing.characteristicEnergies = [...existing.characteristicEnergies, newIsotope.energy];
				}

				// Keep other fields up-to-date with latest submission
				existing.elementName = newIsotope.elementName.trim();
				existing.massNumber = newIsotope.massNumber;
				existing.suffix = newIsotope.suffix.trim();
				saveToStorage(items);
				return items;
			});
		},
		clear: () => {
			set([]);
			saveToStorage([]);
		}
	};
}

export const isotopes = createIsotopeStore();

export const isotopesSorted = derived(isotopes, ($isotopes) => {
	return [...$isotopes].sort((a, b) => {
		const aKey = `${a.elementShortName.toLowerCase()}-${a.massNumber}-${a.suffix.toLowerCase()}`;
		const bKey = `${b.elementShortName.toLowerCase()}-${b.massNumber}-${b.suffix.toLowerCase()}`;
		return aKey.localeCompare(bKey);
	});
});
