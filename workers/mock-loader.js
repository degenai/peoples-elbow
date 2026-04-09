export async function load(url, context, nextLoad) {
  if (url === 'cloudflare:email') {
    return {
      format: 'module',
      shortCircuit: true,
      source: `
        export class EmailMessage {
          constructor(from, to, rawEmail) {
            this.from = from;
            this.to = to;
            this.rawEmail = rawEmail;
          }
        }
      `
    };
  }
  return nextLoad(url, context, nextLoad);
}
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:email') {
    return {
      shortCircuit: true,
      url: 'cloudflare:email'
    };
  }
  return nextResolve(specifier, context, nextResolve);
}
