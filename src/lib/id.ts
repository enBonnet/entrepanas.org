// stdlib first: Web Crypto is available in Workers, Node 19+, and browsers.
export const newId = () => crypto.randomUUID()
