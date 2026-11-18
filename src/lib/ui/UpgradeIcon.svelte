<script lang="ts">
  import type { UpgradeIcon } from '../../../shared/match.js';
  let { kind }: { kind: UpgradeIcon } = $props();
  const paths: Record<UpgradeIcon, string> = {
    power: 'M12 3 5 13h6l-1 8 9-12h-6l1-6Z',
    salvage: 'm5 8 7-4 7 4v8l-7 4-7-4Zm0 0 7 4 7-4m-7 4v8',
    plating: 'M12 3 4 7v6c0 4 8 8 8 8s8-4 8-8V7Zm-4 9 3 3 5-6',
    attack: 'm5 19 7-7m-4-7 11-2-2 11-4-4Zm-5 9 4 4',
    arms: 'M4 17V8l5 3v6m11 0V8l-5 3v6M9 14h6',
    movement: 'M3 12h16m-6-6 6 6-6 6M4 6h5M4 18h5',
    wings: 'm12 17-8-3L2 5l8 5 2 7 2-7 8-5-2 9-8 3Z',
    projectile: 'M11 8 21 3l-5 10-5 2-2-2 2-5ZM3 20l5-5m-5 0 3-3m3 9 3-3',
    sensor:
      'M3 8V4h5m8 0h5v4m0 8v4h-5m-8 0H3v-4m12-4a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    beacon:
      'M12 15v6m-4 0h8m-6-9a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-3 4a6 6 0 0 1 0-8m10 0a6 6 0 0 1 0 8M4 19a10 10 0 0 1 0-14m16 0a10 10 0 0 1 0 14',
  };
</script>

<svg
  viewBox="0 0 24 24"
  width="24"
  height="24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linejoin="round"
  stroke-linecap="round"
  aria-hidden="true"><path d={paths[kind]} /></svg
>
