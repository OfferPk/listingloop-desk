export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function logRequest(info: {
  requestId: string;
  route: string;
  userId?: string;
  durationMs: number;
  status: number;
  error?: string;
}) {
  const payload = { ts: new Date().toISOString(), ...info };
  if (info.status >= 500) console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}
