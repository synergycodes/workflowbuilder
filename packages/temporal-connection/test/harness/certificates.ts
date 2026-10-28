import forge from 'node-forge';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type PemPair = { cert: string; key: string };

/** A throwaway CA with one server leaf (SAN localhost / 127.0.0.1 / ::1) and one client leaf. */
export type TestPki = { ca: PemPair; server: PemPair; client: PemPair };

/** The PEM files a TEMPORAL_TLS_*_PATH-style config can point at; `directory` holds them all, for cleanup. */
export type TestPkiFiles = { directory: string; ca: string; clientCert: string; clientKey: string };

type Issued = { cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey; pem: PemPair };

let nextSerial = 1;

function issue(commonName: string, issuer: Issued | null, extensions: object[]): Issued {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = (nextSerial++).toString(16).padStart(2, '0');
  cert.validity.notBefore = new Date(Date.now() - 60 * 60 * 1000);
  cert.validity.notAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const subject = [{ name: 'commonName', value: commonName }];
  cert.setSubject(subject);
  cert.setIssuer(issuer ? issuer.cert.subject.attributes : subject);
  cert.setExtensions(extensions);
  // rustls, the worker's native transport, rejects forge's default SHA-1 signature.
  cert.sign(issuer ? issuer.key : keys.privateKey, forge.md.sha256.create());
  return {
    cert,
    key: keys.privateKey,
    pem: { cert: forge.pki.certificateToPem(cert), key: forge.pki.privateKeyToPem(keys.privateKey) },
  };
}

export function createTestPki(name: string): TestPki {
  const ca = issue(`${name} test CA`, null, [
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  const server = issue(`${name} server`, ca, [
    { name: 'basicConstraints', cA: false, critical: true },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '::1' },
      ],
    },
  ]);
  const client = issue(`${name} client`, ca, [
    { name: 'basicConstraints', cA: false, critical: true },
    { name: 'keyUsage', digitalSignature: true, critical: true },
    { name: 'extKeyUsage', clientAuth: true },
  ]);
  return { ca: ca.pem, server: server.pem, client: client.pem };
}

/** Writes the CA and client PEMs to a fresh temp directory, so config paths resolve like in production. */
export function writeTestPki(pki: TestPki, name: string): TestPkiFiles {
  const directory = mkdtempSync(path.join(tmpdir(), `wb-tls-${name}-`));
  const files = {
    directory,
    ca: path.join(directory, 'ca.pem'),
    clientCert: path.join(directory, 'client.pem'),
    clientKey: path.join(directory, 'client-key.pem'),
  };
  writeFileSync(files.ca, pki.ca.cert);
  writeFileSync(files.clientCert, pki.client.cert);
  writeFileSync(files.clientKey, pki.client.key);
  return files;
}
