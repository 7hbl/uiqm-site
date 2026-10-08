import dns from 'node:dns';
import { BlockList, isIP } from 'node:net';
import { Agent } from 'undici';

const blockedAddresses = new BlockList();

for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) {
  blockedAddresses.addSubnet(address, prefix, 'ipv4');
}

for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
]) {
  blockedAddresses.addSubnet(address, prefix, 'ipv6');
}

const localHostSuffixes = ['.localhost', '.local', '.internal', '.home.arpa'];

function blockedDestinationError() {
  const error = new Error('Proxy destination is not publicly routable.');
  error.code = 'ERR_PROXY_DESTINATION_BLOCKED';
  return error;
}

export function isBlockedDestinationError(error) {
  for (let current = error; current; current = current.cause) {
    if (current.code === 'ERR_PROXY_DESTINATION_BLOCKED') return true;
  }
  return false;
}

export function isBlockedAddress(address) {
  const value = String(address).replace(/^\[|\]$/g, '');
  const family = isIP(value);
  if (family === 4) return blockedAddresses.check(value, 'ipv4');
  if (family === 6) {
    // BlockList treats IPv4 checks as IPv4-mapped IPv6 internally, so the
    // mapped prefix cannot be stored as a blanket subnet without blocking
    // every IPv4 address. Decode mapped literals and apply the IPv4 ranges.
    const groups = expandIpv6(value);
    if (groups && groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
      const high = groups[6];
      const low = groups[7];
      const mappedIpv4 = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
      return blockedAddresses.check(mappedIpv4, 'ipv4');
    }
    return blockedAddresses.check(value, 'ipv6');
  }
  return true;
}

function expandIpv6(address) {
  let normalized = address.toLowerCase();
  if (normalized.includes('.')) {
    const separator = normalized.lastIndexOf(':');
    const ipv4 = normalized.slice(separator + 1);
    if (separator < 0 || isIP(ipv4) !== 4) return null;
    const octets = ipv4.split('.').map(Number);
    normalized = `${normalized.slice(0, separator)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  if ([...left, ...right].some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  return [...left, ...Array(missing).fill('0'), ...right].map((part) => Number.parseInt(part, 16));
}

export function assertPublicHttpTarget(target) {
  if (!(target instanceof URL) || !['http:', 'https:'].includes(target.protocol)) {
    throw blockedDestinationError();
  }
  if (target.username || target.password) throw blockedDestinationError();

  const hostname = target.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === 'metadata.google.internal' ||
    localHostSuffixes.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw blockedDestinationError();
  }

  if (isIP(hostname) && isBlockedAddress(hostname)) throw blockedDestinationError();
  return target;
}

// Undici calls this resolver at connection time, so DNS answers are checked
// whenever a fresh upstream connection is opened, including redirect targets.
export function createPublicLookup(lookup = dns.lookup) {
  return (hostname, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    lookup(hostname, { all: true, verbatim: true }, (error, records) => {
      if (error) return callback(error);
      if (!Array.isArray(records) || records.length === 0 || records.some(({ address }) => isBlockedAddress(address))) {
        return callback(blockedDestinationError());
      }

      const family = options?.family;
      const candidates = family ? records.filter((record) => record.family === family) : records;
      if (candidates.length === 0) return callback(blockedDestinationError());
      if (options?.all) return callback(null, candidates);
      return callback(null, candidates[0].address, candidates[0].family);
    });
  };
}

export class PublicOnlyProxyAgent extends Agent {
  dispatch(options, handler) {
    try {
      // Fetch follows redirects through the dispatcher. Validate every origin
      // so a public URL cannot redirect the proxy to a private IP address.
      assertPublicHttpTarget(new URL(options.origin));
    } catch (error) {
      queueMicrotask(() => handler.onError(error));
      return false;
    }
    return super.dispatch(options, handler);
  }
}

export { blockedDestinationError };
