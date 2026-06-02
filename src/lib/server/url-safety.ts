import "server-only";

import dns from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import net from "node:net";

function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
  const a = parts[0]!;
  const b = parts[1]!;
  const c = parts[2]!;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 192 && b === 0 ||
    a === 192 && b === 0 && c === 2 ||
    a === 198 && (b === 18 || b === 19) ||
    a === 198 && b === 51 && c === 100 ||
    a === 203 && b === 0 && c === 113 ||
    a >= 224
  );
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === "::1" || value === "::" || value.startsWith("fe80:")) return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("::ffff:")) return isPrivateIPv4(value.replace("::ffff:", ""));
  return false;
}

type PublicLookupAddress = { address: string; family: 4 | 6 };

function isPrivateAddress(address: string): boolean {
  const type = net.isIP(address);
  if (type === 4) return isPrivateIPv4(address);
  if (type === 6) return isPrivateIPv6(address);
  return true;
}

async function resolvePublicHttpUrl(url: URL): Promise<PublicLookupAddress[]> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL invalide.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Cette URL n'est pas autorisée.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Cette URL n'est pas autorisée.");
    return [{ address: hostname, family: net.isIP(hostname) as 4 | 6 }];
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new Error("Cette URL n'est pas autorisée.");
  }

  return addresses as PublicLookupAddress[];
}

export async function assertPublicHttpUrl(url: URL): Promise<void> {
  await resolvePublicHttpUrl(url);
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(new Headers(headers).entries());
}

async function requestWithPinnedLookup(url: URL, init: RequestInit): Promise<Response> {
  const addresses = await resolvePublicHttpUrl(url);
  const selectedAddress = addresses[0]!;
  const client = url.protocol === "https:" ? https : http;

  return await new Promise<Response>((resolve, reject) => {
    const request = client.request(url, {
      method: init.method ?? "GET",
      headers: headersToObject(init.headers),
      lookup: (_hostname, _options, callback) => {
        callback(null, selectedAddress.address, selectedAddress.family);
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      response.on("end", () => {
        resolve(new Response(Buffer.concat(chunks), {
          status: response.statusCode ?? 0,
          headers: response.headers as HeadersInit,
        }));
      });
      response.on("error", reject);
    });

    request.on("error", reject);

    if (init.signal) {
      if (init.signal.aborted) {
        request.destroy();
        reject(new Error("Requête annulée."));
        return;
      }

      init.signal.addEventListener("abort", () => {
        request.destroy();
        reject(new Error("Requête annulée."));
      }, { once: true });
    }

    if (init.body) request.write(init.body);
    request.end();
  });
}

export async function fetchPublicHttpUrl(
  url: URL,
  init: RequestInit = {},
  maxRedirects = 3
): Promise<Response> {
  let currentUrl = new URL(url.href);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await requestWithPinnedLookup(currentUrl, init);

    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get("location");
    if (!location) return response;

    currentUrl = new URL(location, currentUrl);
  }

  throw new Error("Trop de redirections.");
}
