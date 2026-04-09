export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:email') {
    return {
      format: 'module',
      shortCircuit: true,
      url: new URL('data:text/javascript,export class EmailMessage { constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; } }').href
    };
  }
  return nextResolve(specifier, context);
}
