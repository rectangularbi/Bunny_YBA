import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SOURCE } from './source.mjs';

const run = promisify(execFile);
export async function getSourceBytes(url, timeout = 20) {
  const parsed = new URL(url);
  if (parsed.origin !== SOURCE) throw new Error('Неизвестный источник');
  // Windows' system HTTPS client supports the host's connectivity settings.
  // No shell is involved; only the fixed, public source is permitted.
  if (process.platform === 'win32') {
    const script = "$ErrorActionPreference = 'Stop'; $r = Invoke-WebRequest -UseBasicParsing -Uri $env:YBA_PUBLIC_SOURCE_URL -TimeoutSec ([int]$env:YBA_SOURCE_TIMEOUT); [Console]::Out.Write([Convert]::ToBase64String($r.RawContentStream.ToArray()))";
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, windowsHide: true, timeout: (timeout + 5) * 1000,
      env: { ...process.env, YBA_PUBLIC_SOURCE_URL: url, YBA_SOURCE_TIMEOUT: String(timeout) },
    });
    return Buffer.from(stdout.trim(), 'base64');
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout * 1000) });
  if (!response.ok) throw new Error(`YBA Values: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
