<script lang="ts">
	import { onMount } from 'svelte';
	import { isotopes, isotopesSorted } from '$lib/isotopes';
	import { get } from 'svelte/store';

	let elementName = $state('');
	let elementShortName = $state('');
	let massNumber = $state('');
	let suffix = $state('');
	let halfLife = $state('');
	let halfLifeUnit = $state('s');
	let energy = $state('');

	const halfLifeUnits = [
		{ value: 's', label: 'seconds' },
		{ value: 'm', label: 'minutes' },
		{ value: 'h', label: 'hours' },
		{ value: 'd', label: 'days' },
		{ value: 'w', label: 'weeks' },
		{ value: 'y', label: 'years' }
	];

	function convertToSeconds(value: number, unit: string) {
		switch (unit) {
			case 'm':
				return value * 60;
			case 'h':
				return value * 60 * 60;
			case 'd':
				return value * 60 * 60 * 24;
			case 'w':
				return value * 60 * 60 * 24 * 7;
			case 'y':
				return value * 60 * 60 * 24 * 365;
			case 's':
			default:
				return value;
		}
	}

	function formatHalfLife(seconds: number) {
		return `${seconds} s`;
	}

	let feedback = $state('');

	function resetForm() {
		elementName = '';
		elementShortName = '';
		massNumber = '';
		suffix = '';
		halfLife = '';
		energy = '';
	}

	async function addEnergy(event: Event) {
		event.preventDefault();
		feedback = '';

		const parsedEnergy = Number(energy);
		const parsedHalfLife = Number(halfLife);
		const parsedMass = Number(massNumber);
		const halfLifeSeconds = convertToSeconds(parsedHalfLife, halfLifeUnit);

		if (!elementName.trim() || !elementShortName.trim() || Number.isNaN(parsedMass)) {
			feedback = 'Element name, short name, and mass number are required.';
			return;
		}
		if (Number.isNaN(parsedEnergy) || parsedEnergy <= 0) {
			feedback = 'Characteristic energy must be a positive number.';
			return;
		}
		if (
			Number.isNaN(parsedHalfLife) ||
			parsedHalfLife <= 0 ||
			Number.isNaN(halfLifeSeconds) ||
			halfLifeSeconds <= 0
		) {
			feedback = 'Half life must be a positive number.';
			return;
		}

		try {
			await isotopes.addEnergy({
				elementName,
				elementShortName,
				massNumber: parsedMass,
				suffix,
				halfLife: halfLifeSeconds,
				energy: parsedEnergy
			});
			feedback = 'Energy added.';
			resetForm();
		} catch (error) {
			feedback =
				typeof error === 'string'
					? error
					: 'Unable to save isotope data. Check server configuration.';
		}
	}

	function clearAll() {
		if (confirm('Clear all isotopes?')) {
			isotopes.clear();
			feedback = 'All isotopes cleared.';
		}
	}

	let isotopeCount = $state(0);

	onMount(() => {
		isotopeCount = get(isotopesSorted).length;
		const unsubscribe = isotopesSorted.subscribe(($list) => (isotopeCount = $list.length));
		return unsubscribe;
	});
</script>

<div class="page">
	<h1>Isotopes</h1>
	<p>
		Use this form to add characteristic energies to an isotope. When an isotope already exists, the
		new energy is appended to its list.
	</p>

	<form onsubmit={addEnergy}>
		<div>
			<label for="elementName">Element name</label>
			<input id="elementName" type="text" bind:value={elementName} placeholder="Uranium" required />
		</div>

		<div>
			<label for="elementShortName">Element short name</label>
			<input
				id="elementShortName"
				type="text"
				bind:value={elementShortName}
				placeholder="U"
				required
			/>
		</div>

		<div>
			<label for="massNumber">Mass number</label>
			<input
				id="massNumber"
				type="number"
				min="1"
				step="1"
				bind:value={massNumber}
				placeholder="87"
				required
			/>
		</div>

		<div>
			<label for="suffix">State suffix (e.g. m)</label>
			<input id="suffix" type="text" bind:value={suffix} placeholder="m" />
		</div>

		<div>
			<label for="halfLife">Half life</label>
			<div class="half-life-row">
				<input
					id="halfLife"
					type="number"
					min="0"
					step="any"
					bind:value={halfLife}
					placeholder="1.4e17"
					required
				/>
				<select bind:value={halfLifeUnit}>
					{#each halfLifeUnits as unit}
						<option value={unit.value}>{unit.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label for="energy">Characteristic energy</label>
			<input
				id="energy"
				type="number"
				min="0"
				step="any"
				bind:value={energy}
				placeholder="0.186"
				required
			/>
		</div>

		<div style="align-self:flex-end; display:flex; gap: 0.5rem;">
			<button type="submit">Add energy</button>
			<button type="button" class="secondary" onclick={clearAll}>Clear all</button>
		</div>
	</form>

	{#if feedback}
		<div class="feedback">{feedback}</div>
	{/if}

	<div class="table-wrapper">
		<table>
			<thead>
				<tr>
					<th>Isotope</th>
					<th>Element</th>
					<th>Short</th>
					<th>Mass</th>
					<th>State</th>
					<th>Half life</th>
					<th>Characteristic energies</th>
				</tr>
			</thead>
			<tbody>
				{#each $isotopesSorted as iso (iso.elementShortName + iso.massNumber + iso.suffix)}
					<tr>
						<td>{iso.elementShortName}-{iso.massNumber}{iso.suffix}</td>
						<td>{iso.elementName}</td>
						<td>{iso.elementShortName}</td>
						<td>{iso.massNumber}</td>
						<td>{iso.suffix}</td>
						<td>{iso.halfLife} s</td>
						<td>{iso.characteristicEnergies.join(', ')}</td>
					</tr>
				{/each}
				{#if $isotopesSorted.length === 0}
					<tr>
						<td colspan="7">No isotopes defined yet.</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
	<p>{isotopeCount} isotope{isotopeCount === 1 ? '' : 's'}</p>
</div>

<style>
	.page {
		max-width: 860px;
		margin: 0 auto;
		padding: 1rem;
	}
	form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}
	form > div {
		display: flex;
		flex-direction: column;
	}
	label {
		font-weight: 600;
		margin-bottom: 0.2rem;
	}
	input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	button {
		padding: 0.6rem 1rem;
		font-weight: 600;
		border-radius: 4px;
		border: none;
		background: #1d4ed8;
		color: white;
		cursor: pointer;
	}
	button.secondary {
		background: #4b5563;
	}
	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.half-life-row {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		flex-wrap: wrap;
	}
	.half-life-row input,
	.half-life-row select {
		min-width: 0;
	}
	.table-wrapper {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1rem;
	}
	th,
	td {
		text-align: left;
		padding: 0.6rem 0.5rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
	}
	th {
		background: rgba(0, 0, 0, 0.05);
	}
	.feedback {
		margin-top: 0.5rem;
		font-weight: 600;
	}
</style>
