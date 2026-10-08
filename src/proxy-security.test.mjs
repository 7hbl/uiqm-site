import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPublicHttpTarget,
  createPublicLookup,
  isBlockedAddress,
  isBlockedDestinationError,
  PublicOnlyProxyAgent,
} from './proxy-security.mjs';

test('blocks loopback, private, link-local, and non-public IP ranges', () => {
  for (const address of [
    '127.0.0.1', '10.0.0.8', '172.20.1.2', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', '::ffff:7f00:1',
    'fc00::1', 'fe80::1', '2001:db8::1', '::',
  ]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
});

test('allows public IPv4 and IPv6 addresses', () => {
  assert.equal(isBlockedAddress('93.184.216.34'), false);
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
  assert.equal(isBlockedAddress('::ffff:5db8:d822'), false);
});

test('rejects local hostnames, credentials, and unsupported schemes', () => {
  for (const value of [
    'http://localhost/',
    'http://service.local/',
    'http://metadata.google.internal/',
    'http://127.0.0.1/',
    'http://[::1]/',
    'http://user:pass@example.com/',
    'file:///etc/passwd',
  ]) {
    assert.throws(() => assertPublicHttpTarget(new URL(value)), { code: 'ERR_PROXY_DESTINATION_BLOCKED' }, value);
  }
});

test('checks every DNS answer and returns only public addresses', async () => {
  const lookup = createPublicLookup((hostname, options, callback) => {
    assert.deepEqual(options, { all: true, verbatim: true });
    const records = hostname === 'public.test'
      ? [{ address: '93.184.216.34', family: 4 }, { address: '2606:4700:4700::1111', family: 6 }]
      : [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }];
    callback(null, records);
  });

  const resolved = await new Promise((resolve, reject) => {
    lookup('public.test', { all: true }, (error, records) => error ? reject(error) : resolve(records));
  });
  assert.equal(resolved.length, 2);

  await assert.rejects(new Promise((resolve, reject) => {
    lookup('mixed.test', {}, (error, address) => error ? reject(error) : resolve(address));
  }), { code: 'ERR_PROXY_DESTINATION_BLOCKED' });
});

test('dispatcher blocks private redirect destinations before connecting', async () => {
  const dispatcher = new PublicOnlyProxyAgent({ connect: { lookup: createPublicLookup() } });
  const error = await new Promise((resolve) => {
    dispatcher.dispatch({ origin: 'http://127.0.0.1:8080' }, { onError: resolve });
  });
  assert.equal(isBlockedDestinationError(error), true);
  await dispatcher.close();
});
