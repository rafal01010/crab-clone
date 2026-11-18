<script lang="ts">
  let { rarity }: { rarity: string } = $props();
  const treatment = $derived(
    rarity === 'legendary'
      ? { label: 'Legendary', marks: '◆◆◆◆' }
      : rarity === 'epic'
        ? { label: 'Epic', marks: '◆◆◆' }
        : rarity === 'rare'
          ? { label: 'Rare', marks: '◇◇' }
          : rarity === 'common'
            ? { label: 'Common', marks: '○' }
            : rarity === 'branching'
              ? { label: 'Branch upgrade', marks: '⑂' }
              : {
                  label: rarity === 'fixed' ? 'Fixed effect' : 'Ability',
                  marks: '·',
                },
  );
</script>

<span class="rarity-badge" data-rarity={rarity}>
  <span aria-hidden="true">{treatment.marks}</span>{treatment.label}
</span>

<style>
  .rarity-badge {
    --rarity: #c6cbd3;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    align-self: start;
    width: fit-content;
    border: 1px solid var(--rarity);
    color: var(--rarity);
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
  }
  [data-rarity='rare'] {
    --rarity: #79b8ff;
    border-style: dashed;
  }
  [data-rarity='epic'] {
    --rarity: #b698ff;
    border-width: 3px;
    border-style: double;
    padding: 2px 6px;
  }
  [data-rarity='legendary'] {
    --rarity: #ffb829;
    border-width: 2px;
    padding: 3px 7px;
    border-radius: 9px 0;
  }
  [data-rarity='branching'],
  [data-rarity='fixed'] {
    border-style: dotted;
  }
</style>
