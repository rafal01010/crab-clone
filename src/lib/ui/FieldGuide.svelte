<script lang="ts">
  import { usePreferences, actionLabel } from '../game-client/preferences.js';
  const preferences = usePreferences();
</script>

<div class="field-guide">
  <p>
    Move with {actionLabel(preferences, 'up')}, {actionLabel(
      preferences,
      'left',
    )}, {actionLabel(preferences, 'down')}, and {actionLabel(
      preferences,
      'right',
    )} and aim with the mouse. Movement and aim are independent.
    {actionLabel(preferences, 'primary')} uses your primary attack or the basic strike.
    {actionLabel(preferences, 'secondary')} uses secondary, {actionLabel(
      preferences,
      'movement',
    )} uses movement, and {actionLabel(preferences, 'ultimate')} uses your ultimate.
    Attacks are manual. Hold and release the Slug Launcher or Leap to charge them.
  </p>
  <p>
    Approach salvage to collect its four stages. Each stage gives progress.
    Healing marks identify repair salvage. Level up to choose upgrades. Number
    keys select an option and Enter confirms it. Choices have a deadline; the
    world continues, and boundary damage bypasses combat protection.
  </p>
  <p>
    New abilities equip automatically. The offer shows any replacement. Replaced
    abilities stay learned, and their passive benefits remain. Rearrange
    equipment during upgrade or specialization choices. Equipment changes
    preserve cooldowns.
  </p>
  <p>
    Overload improves rarity chances and increases incoming combat damage. This
    risk belongs to your craft. Grass, sand, snow, and water affect travel
    differently. Water slows your craft, and deeper water slows it more. Terrain
    adaptation helps movement. Heat and cold adaptation reduce weather exposure.
    Watch local weather warnings and your exposure meters.
  </p>
  <p>
    Discovering a site gives discovery credit. Claiming a reward consumes that
    site for everyone. Review costs and eligibility before confirming. A
    reservation expires; leaving releases it, and spent protection does not
    return.
  </p>
  <p>
    Firmware patterns have consistent effects within a run. Your sensors
    identify nearby patterns privately. Unknown firmware can harm you. Stay
    close through all consumption stages to apply its effect.
  </p>
  <p>
    Press {actionLabel(preferences, 'interact')} near a site, firmware capsule, shelter,
    or recruitable bot. Nearby buttons let you pick a specific target. Green diamonds
    mark recruitment offers. A green signal above a bot's hull bar marks an ally.
    Shelters have finite shared lifetime and force you outside when exhausted. The
    boundary still hurts you inside.
  </p>
  <p>
    You have one life. At zero hull you are eliminated and can spectate
    surviving craft. Stay inside the amber boundary to avoid hull damage. The
    boundary closes around the center later in the match, even during choices,
    inspection, and shelter. Avoid meteor impact rings.
  </p>
</div>

<style>
  p {
    line-height: 1.55;
    margin: 0 0 12px;
  }
</style>
