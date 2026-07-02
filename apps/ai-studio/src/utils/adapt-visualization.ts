import { BACKEND_URL } from '../config';
import { getTurnstileToken } from '../security/turnstile';

export async function adaptVisualization(content: string, format: string): Promise<string> {
  const token = await getTurnstileToken();
  const response = await fetch(`${BACKEND_URL}/api/visualize/adapt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'cf-turnstile-token': token } : {}),
    },
    body: JSON.stringify({ content, format }),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? 'Adapt failed');
  }
  const data = (await response.json()) as { output: string };
  return data.output;
}
