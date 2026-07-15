import fs from "node:fs";
import https from "node:https";
import tls from "node:tls";
import { URL } from "node:url";

function getCaBundle(): string[] {
  const cas: string[] = [];
  const tlsWithCa = tls as typeof tls & {
    getCACertificates?: (kind: "default" | "system") => string[];
  };

  try {
    if (tlsWithCa.getCACertificates) {
      cas.push(...tlsWithCa.getCACertificates("default"));
      cas.push(...tlsWithCa.getCACertificates("system"));
    }
  } catch {
    // Older Node versions without getCACertificates
  }

  const extra = process.env.NODE_EXTRA_CA_CERTS;
  if (extra && fs.existsSync(extra)) {
    cas.push(fs.readFileSync(extra, "utf8"));
  }

  return cas;
}

let agent: https.Agent | undefined;

function getHttpsAgent(): https.Agent {
  if (!agent) {
    agent = new https.Agent({
      ca: getCaBundle(),
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
    });
  }
  return agent;
}

/** Server-side HTTPS fetch that trusts the OS certificate store (corporate proxies). */
export async function serverFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = new URL(input.toString());
  if (url.protocol !== "https:") {
    return fetch(input, init);
  }

  const method = init.method ?? "GET";
  const headers = normalizeHeaders(init.headers);
  const body =
    init.body == null
      ? undefined
      : typeof init.body === "string"
        ? init.body
        : Buffer.from(await new Response(init.body).arrayBuffer());

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method, headers, agent: getHttpsAgent() },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              for (const item of value) responseHeaders.append(key, item);
            } else {
              responseHeaders.set(key, value);
            }
          }

          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 500,
              statusText: res.statusMessage,
              headers: responseHeaders,
            }),
          );
        });
      },
    );

    req.on("error", (error) => {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY"
      ) {
        reject(
          new Error(
            "HTTPS certificate verification failed. If you are on a corporate network, set NODE_USE_SYSTEM_CA=1 when running the dev server, or add your company root CA via NODE_EXTRA_CA_CERTS.",
            { cause: error },
          ),
        );
        return;
      }
      reject(error);
    });

    if (body) req.write(body);
    req.end();
  });
}

function normalizeHeaders(
  headers: HeadersInit | undefined,
): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers;
}
