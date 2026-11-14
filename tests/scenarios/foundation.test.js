import { test } from 'node:test';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Match } from '../../build-host/server/match/match.js';
import { IntentQueue } from '../../build-host/server/network/intents.js';
import { createRegistry } from '../../build-host/server/content/registry.js';
import { observe } from '../../build-host/server/match/view.js';
import { loadCatalogue } from '../../build-host/server/content/catalogue.js';

await RAPIER.init();

test('lifecycle rejects invalid transitions and preserves connection separately from life', () => {
  const match = new Match('seed-1', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    assert.equal(match.accept({ kind: 'finish' }), false);
    assert.equal(match.accept({ kind: 'join', playerId: 'a' }), true);
    assert.equal(match.accept({ kind: 'disconnect', playerId: 'a' }), true);
    assert.equal(match.view('a').players[0].life.kind, 'alive');
    assert.equal(match.accept({ kind: 'connect', playerId: 'a' }), true);
    assert.equal(match.accept({ kind: 'start' }), true);
    assert.equal(match.accept({ kind: 'eliminate', playerId: 'a' }), true);
    assert.equal(
      match.accept({ kind: 'activity', playerId: 'a', activity: 'selecting' }),
      false,
    );
    assert.equal(match.accept({ kind: 'disconnect', playerId: 'a' }), true);
    assert.equal(match.view('a').players[0].life.kind, 'eliminated');
    assert.equal(match.accept({ kind: 'finish' }), true);
    assert.equal(match.accept({ kind: 'start' }), false);
  } finally {
    match.dispose();
  }
});

test('private offers are visible only to their owner', () => {
  const match = new Match('seed-2', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'join', playerId: 'b' });
    match.accept({ kind: 'start' });
    assert.equal(
      match.setOffer('a', {
        id: 'secret-offer',
        revision: 1,
        choices: ['secret-choice'],
      }),
      true,
    );
    assert.equal(observe(match, 'a', 1, 100).state.offer.id, 'secret-offer');
    assert.equal(
      JSON.stringify(observe(match, 'b', 1, 100)).includes('secret'),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('intent queue rejects malformed, duplicated, and unauthorized input', () => {
  const queue = new IntentQueue();
  const session = { playerId: 'a', matchId: 'm' };
  const ready = { ...session, sequence: 1, kind: 'ready', ready: true };
  assert.equal(
    queue.accept({ ...ready, position: [1, 2, 3] }, session, () => true).status,
    'rejected',
  );
  assert.equal(queue.accept(ready, session, () => true).status, 'queued');
  assert.equal(queue.accept(ready, session, () => true).status, 'rejected');
  assert.equal(
    queue.accept({ ...ready, sequence: 2, playerId: 'b' }, session, () => true)
      .status,
    'rejected',
  );
  assert.equal(queue.drain().length, 1);
});

test('release gate rejects unfinished selectable content', () => {
  const unfinished = {
    id: 'item',
    aliases: [],
    disposition: 'blocked',
    selectable: true,
    name: 'Item',
    description: 'Item',
    pool: 'ordinary',
    maxRank: 1,
    rarities: ['common'],
    values: { common: [1] },
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: [],
    effect: 'missing',
    specializations: [],
  };
  assert.throws(
    () => createRegistry([unfinished], new Set()),
    /unfinished selectable/,
  );
  assert.throws(
    () => createRegistry([], new Set(), true),
    /source catalogue audit/,
  );
});

test(
  'production host serves the page and authenticates an observation stream',
  { skip: !process.env.YCCE_TEST_URL },
  async () => {
    const { io } = await import('socket.io-client');
    const url = process.env.YCCE_TEST_URL;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /You Can Crab Everything/);
    const socket = io(url, {
      forceNew: true,
      reconnection: false,
      timeout: 3000,
    });
    try {
      const content = new Promise((resolve) => socket.once('content', resolve));
      const session = await new Promise((resolve, reject) => {
        socket.once('session', resolve);
        socket.once('connect_error', reject);
      });
      const observation = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Observation timeout')),
          3000,
        );
        socket.once('observation', (value) => {
          clearTimeout(timeout);
          resolve(value);
        });
      });
      assert.deepEqual(await content, []);
      assert.equal(observation.matchId, session.matchId);
      assert.ok(
        observation.state.players.some(
          (player) => player.id === session.playerId,
        ),
      );
      const ready = {
        kind: 'ready',
        ready: true,
        matchId: session.matchId,
        playerId: session.playerId,
        sequence: 1,
      };
      const send = (value) =>
        new Promise((resolve) =>
          socket
            .timeout(3000)
            .emit('intent', value, (error, acknowledgment) =>
              resolve(error ? { status: 'timeout' } : acknowledgment),
            ),
        );
      const duplicate = io(url, {
        autoConnect: false,
        auth: { token: session.token },
        forceNew: true,
        reconnection: false,
        timeout: 3000,
      });
      try {
        const rejected = new Promise((resolve) =>
          duplicate.once('session-rejected', resolve),
        );
        duplicate.connect();
        assert.deepEqual(await rejected, { reason: 'session-in-use' });
      } finally {
        duplicate.disconnect();
      }
      assert.equal(socket.connected, true);
      assert.equal((await send(ready)).status, 'queued');
      assert.equal((await send(ready)).status, 'rejected');
      assert.equal(
        (await send({ ...ready, sequence: 2, damage: 100 })).status,
        'rejected',
      );
    } finally {
      socket.disconnect();
    }
  },
);

test('registry exposes eligible verified fixture data and rejects invalid references', () => {
  const base = {
    id: 'starter',
    aliases: ['starter-alias'],
    disposition: 'implemented',
    selectable: true,
    name: 'Starter',
    description: 'Fixture effect',
    pool: 'ordinary',
    maxRank: 2,
    rarities: ['common'],
    values: { common: [1, 2] },
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: [],
    effect: 'fixture-effect',
    specializations: [],
  };
  const branch = {
    ...base,
    id: 'branch',
    aliases: [],
    requirement: { kind: 'rank', id: 'starter', minimum: 2 },
  };
  const registry = createRegistry([base, branch], new Set(['fixture-effect']));
  assert.deepEqual(registry.eligible(new Map(), new Set(), 'ordinary'), [
    'starter',
  ]);
  assert.deepEqual(
    registry.eligible(new Map([['starter', 2]]), new Set(), 'ordinary'),
    ['branch'],
  );
  assert.equal(registry.publicContent().length, 2);
  assert.equal(
    JSON.stringify(registry.publicContent()).includes('fixture-effect'),
    false,
  );
  assert.throws(
    () =>
      createRegistry(
        [{ ...base, requirement: { kind: 'rank', id: 'missing', minimum: 1 } }],
        new Set(['fixture-effect']),
      ),
    /unknown reference/,
  );
  assert.throws(
    () =>
      createRegistry(
        [{ ...base, values: { common: [1] } }],
        new Set(['fixture-effect']),
      ),
    /rank table/,
  );
});

test(
  'scenario reports a failing predicate',
  { skip: process.env.YCCE_DEMONSTRATE_FAILURE !== '1' },
  () => {
    const match = new Match(
      'failure-demo',
      new RAPIER.World({ x: 0, y: 0, z: 0 }),
    );
    try {
      match.accept({ kind: 'join', playerId: 'a' });
      assert.equal(match.view('a').phase, 'running');
    } finally {
      match.dispose();
    }
  },
);

test('selection activity and private offers stay consistent', () => {
  const match = new Match('selection', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'start' });
    assert.equal(
      match.accept({ kind: 'activity', playerId: 'a', activity: 'selecting' }),
      false,
    );
    assert.equal(
      match.setOffer('a', { id: 'offer', revision: 1, choices: ['choice'] }),
      true,
    );
    assert.equal(match.view('a').offer.id, 'offer');
    assert.equal(
      match.accept({ kind: 'activity', playerId: 'a', activity: 'playing' }),
      true,
    );
    assert.equal(match.view('a').offer, null);
    assert.equal(
      match.accept({ kind: 'activity', playerId: 'a', activity: 'selecting' }),
      false,
    );
  } finally {
    match.dispose();
  }
});

test('the agreed Standard configuration is applied once to each player', async () => {
  const { registry, coverage } = await loadCatalogue();
  assert.deepEqual(registry.coverage(), [
    { id: 'standard', disposition: 'implemented', selectable: false },
    { id: 'plated', disposition: 'blocked', selectable: false },
  ]);
  assert.deepEqual(
    registry.definition('plated').values.common,
    [5, 10, 15, 20, 25],
  );
  assert.deepEqual(
    registry.definition('plated').values.legendary,
    [8, 16, 24, 32, 40],
  );
  assert.equal(
    registry.publicContent().some((entry) => entry.id === 'plated'),
    false,
  );
  assert.equal(
    registry.eligible(new Map(), new Set(), 'ordinary').includes('plated'),
    false,
  );
  assert.equal(registry.eligible(new Map(), new Set(), 'starting').length, 0);
  assert.ok(
    coverage.some(
      (entry) => entry.id === 'standard' && entry.disposition === 'implemented',
    ),
  );
  const match = new Match('standard', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'join', playerId: 'b' });
    assert.deepEqual(
      match.view('a').players.map((player) => player.maximumHealthBonus),
      [15, 15],
    );
    match.accept({ kind: 'disconnect', playerId: 'a' });
    match.accept({ kind: 'connect', playerId: 'a' });
    assert.equal(match.view('a').players[0].maximumHealthBonus, 15);
  } finally {
    match.dispose();
  }
});

test('hidden player identities and state do not enter another viewer packet', () => {
  const match = new Match('visibility', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  try {
    match.accept({ kind: 'join', playerId: 'viewer' });
    match.accept({ kind: 'join', playerId: 'secret-player' });
    assert.equal(
      match.setPlayerVisibility('viewer', 'secret-player', false),
      true,
    );
    assert.equal(
      JSON.stringify(observe(match, 'viewer', 1, 1)).includes('secret-player'),
      false,
    );
    assert.ok(
      JSON.stringify(observe(match, 'secret-player', 1, 1)).includes(
        'secret-player',
      ),
    );
    assert.equal(match.setPlayerVisibility('viewer', 'viewer', false), false);
    assert.equal(
      match.setPlayerVisibility('viewer', 'secret-player', true),
      true,
    );
    assert.ok(
      JSON.stringify(observe(match, 'viewer', 2, 2)).includes('secret-player'),
    );
  } finally {
    match.dispose();
  }
});

test('specialization requirements refer to owned specializations, not content IDs', () => {
  const root = {
    id: 'root',
    aliases: [],
    disposition: 'implemented',
    selectable: true,
    name: 'Root',
    description: 'Root',
    pool: 'ordinary',
    maxRank: 1,
    rarities: ['common'],
    values: { common: [1] },
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: [],
    effect: 'effect',
    specializations: ['root-path'],
  };
  const branch = {
    ...root,
    id: 'branch',
    name: 'Branch',
    specializations: [],
    requirement: { kind: 'specialization', id: 'root-path' },
  };
  const registry = createRegistry([root, branch], new Set(['effect']));
  assert.deepEqual(registry.eligible(new Map(), new Set(), 'ordinary'), [
    'root',
  ]);
  assert.deepEqual(
    registry.eligible(
      new Map([['root', 1]]),
      new Set(['root-path']),
      'ordinary',
    ),
    ['branch'],
  );
  assert.throws(
    () =>
      createRegistry(
        [
          root,
          { ...branch, requirement: { kind: 'specialization', id: 'root' } },
        ],
        new Set(['effect']),
      ),
    /Unknown required specialization/,
  );
  assert.throws(
    () =>
      createRegistry(
        [root, { ...branch, specializations: ['root-path'] }],
        new Set(['effect']),
      ),
    /Duplicate or empty specialization/,
  );
});

test(
  'a second production host reports an occupied port',
  { skip: !process.env.YCCE_TEST_URL },
  async () => {
    const { spawn } = await import('node:child_process');
    const { once } = await import('node:events');
    const target = new URL(process.env.YCCE_TEST_URL);
    const child = spawn(process.execPath, ['build-host/server/index.js'], {
      env: { ...process.env, HOST: target.hostname, PORT: target.port },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let error = '';
    child.stderr.on('data', (chunk) => {
      error += chunk.toString();
    });
    const [code] = await once(child, 'exit');
    assert.notEqual(code, 0);
    assert.match(
      error,
      /Host startup failed:.*(?:EADDRINUSE|address already in use)/i,
    );
  },
);

test('rejected intents do not change authoritative state or consume the offer', () => {
  const match = new Match('authority', new RAPIER.World({ x: 0, y: 0, z: 0 }));
  const queue = new IntentQueue();
  const session = { playerId: 'a', matchId: 'authority' };
  try {
    match.accept({ kind: 'join', playerId: 'a' });
    match.accept({ kind: 'start' });
    match.setOffer('a', { id: 'offer', revision: 4, choices: ['legal'] });
    const before = match.view('a');
    const base = {
      ...session,
      kind: 'choice',
      sequence: 1,
      offerId: 'offer',
      revision: 4,
      choiceId: 'legal',
    };
    const candidates = [
      { ...base, choiceId: 'forged' },
      { ...base, revision: 3 },
      { ...base, playerId: 'someone-else' },
      { ...base, offerId: 'x'.repeat(129) },
      { ...base, damage: 999 },
      {
        ...session,
        sequence: 1,
        kind: 'control',
        x: 1,
        y: 0,
        aim: 0,
        buttons: 0,
      },
    ];
    for (const input of candidates)
      assert.equal(
        queue.accept(input, session, (intent) => match.authorize(intent))
          .status,
        'rejected',
      );
    for (const intent of queue.drain()) match.consume(intent);
    assert.deepEqual(match.view('a'), before);
    assert.deepEqual(match.takeSelections(), []);
    assert.equal(
      queue.accept(base, session, (intent) => match.authorize(intent)).status,
      'queued',
    );
    assert.equal(
      queue.accept(base, session, (intent) => match.authorize(intent)).status,
      'rejected',
    );
    for (const intent of queue.drain()) match.consume(intent);
    assert.deepEqual(match.takeSelections(), [
      { playerId: 'a', choiceId: 'legal' },
    ]);
    assert.equal(match.view('a').offer, null);
  } finally {
    match.dispose();
  }
});

test('registry rejects alias collisions, impossible ranks, and missing effect handlers', () => {
  const base = {
    id: 'root',
    aliases: ['shared-name'],
    disposition: 'implemented',
    selectable: true,
    name: 'Root',
    description: 'Root',
    pool: 'ordinary',
    maxRank: 2,
    rarities: ['common'],
    values: { common: [1, 2] },
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: [],
    effect: 'bound',
    specializations: [],
  };
  assert.throws(
    () => createRegistry([base, { ...base, id: 'other' }], new Set(['bound'])),
    /Conflicting content alias/,
  );
  assert.throws(
    () =>
      createRegistry(
        [
          base,
          {
            ...base,
            id: 'other',
            aliases: [],
            requirement: { kind: 'rank', id: 'root', minimum: 3 },
          },
        ],
        new Set(['bound']),
      ),
    /Invalid required rank/,
  );
  assert.throws(
    () => createRegistry([base], new Set()),
    /unfinished selectable content/,
  );
  assert.throws(
    () =>
      createRegistry([{ ...base, disposition: 'blocked' }], new Set(['bound'])),
    /unfinished selectable content/,
  );
});

test('registry excludes choices in either direction and partitions offer pools', () => {
  const base = {
    id: 'a',
    aliases: [],
    disposition: 'implemented',
    selectable: true,
    name: 'A',
    description: 'A',
    pool: 'ordinary',
    maxRank: 1,
    rarities: ['common'],
    values: { common: [1] },
    requirement: { kind: 'none' },
    exclusions: ['b'],
    affinities: [],
    effect: 'effect',
    specializations: [],
  };
  const other = { ...base, id: 'b', name: 'B', exclusions: [] };
  const branch = { ...other, id: 'branch', name: 'Branch', pool: 'branching' };
  const registry = createRegistry([base, other, branch], new Set(['effect']));
  assert.deepEqual(
    registry.eligible(new Map([['a', 1]]), new Set(), 'ordinary'),
    [],
  );
  assert.deepEqual(
    registry.eligible(new Map([['b', 1]]), new Set(), 'ordinary'),
    [],
  );
  assert.deepEqual(registry.eligible(new Map(), new Set(), 'branching'), [
    'branch',
  ]);
});

test(
  'four players join, the fifth is rejected, and a reserved player can reconnect',
  { skip: !process.env.YCCE_TEST_URL, timeout: 15000 },
  async () => {
    const { spawn } = await import('node:child_process');
    const { once } = await import('node:events');
    const { io } = await import('socket.io-client');
    const url = new URL(process.env.YCCE_TEST_URL);
    url.port = '3221';
    const host = spawn(process.execPath, ['build-host/server/index.js'], {
      env: { ...process.env, HOST: url.hostname, PORT: url.port },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const clients = [];
    const exited = once(host, 'exit');
    try {
      await new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(
          () => reject(new Error('Host startup timed out')),
          5000,
        );
        host.stdout.on('data', (chunk) => {
          output += chunk.toString();
          if (output.includes('Host listening')) {
            clearTimeout(timeout);
            resolve();
          }
        });
        host.once('exit', (code) => {
          clearTimeout(timeout);
          reject(new Error(`Host exited before startup: ${code}`));
        });
      });
      const sessions = [];
      for (let i = 0; i < 4; i++) {
        const socket = io(url.origin, {
          autoConnect: false,
          forceNew: true,
          reconnection: false,
          timeout: 3000,
        });
        clients.push(socket);
        const session = new Promise((resolve, reject) => {
          socket.once('session', resolve);
          socket.once('connect_error', reject);
        });
        socket.connect();
        sessions.push(await session);
      }
      assert.equal(
        new Set(sessions.map((session) => session.playerId)).size,
        4,
      );
      const fifth = io(url.origin, {
        autoConnect: false,
        forceNew: true,
        reconnection: false,
      });
      clients.push(fifth);
      const rejection = new Promise((resolve) =>
        fifth.once('session-rejected', resolve),
      );
      fifth.connect();
      assert.deepEqual(await rejection, { reason: 'match-full' });
      assert.ok(clients.slice(0, 4).every((client) => client.connected));
      const disconnected = new Promise((resolve) => {
        clients[1].on('observation', function listener(observation) {
          const player = observation.state.players.find(
            (entry) => entry.id === sessions[0].playerId,
          );
          if (player && !player.connected) {
            clients[1].off('observation', listener);
            resolve();
          }
        });
      });
      clients[0].disconnect();
      await disconnected;
      const resumed = io(url.origin, {
        autoConnect: false,
        auth: { token: sessions[0].token },
        forceNew: true,
        reconnection: false,
      });
      clients.push(resumed);
      const session = new Promise((resolve) =>
        resumed.once('session', resolve),
      );
      resumed.connect();
      assert.equal((await session).playerId, sessions[0].playerId);
    } finally {
      for (const client of clients) client.disconnect();
      if (host.exitCode === null && host.signalCode === null)
        host.kill('SIGTERM');
      const [exitCode] = await exited;
      assert.equal(exitCode, 0);
    }
  },
);

test('offer descriptions use the selected rank values and never project blocked entries', () => {
  const definition = {
    id: 'upgrade',
    aliases: [],
    disposition: 'implemented',
    selectable: true,
    name: 'Upgrade',
    description: 'Increases plating.',
    rankDescription: 'Adds {value} plating.',
    pool: 'ordinary',
    maxRank: 2,
    rarities: ['common'],
    values: { common: [5, 10] },
    requirement: { kind: 'none' },
    exclusions: [],
    affinities: [],
    effect: 'effect',
    specializations: [],
  };
  const registry = createRegistry(
    [
      definition,
      {
        ...definition,
        id: 'blocked',
        name: 'Blocked',
        disposition: 'blocked',
        selectable: false,
      },
    ],
    new Set(['effect']),
  );
  assert.deepEqual(registry.describe('upgrade', 'common', 2), {
    id: 'upgrade',
    name: 'Upgrade',
    rarity: 'common',
    rank: 2,
    description: 'Adds 10 plating.',
  });
  assert.equal(registry.describe('upgrade', 'common', 3), undefined);
  assert.equal(registry.describe('upgrade', 'legendary', 1), undefined);
  assert.equal(registry.describe('blocked', 'common', 1), undefined);
});
