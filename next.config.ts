import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  // max-age=1 ano; includeSubDomains força HTTPS em subdomínios também
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Isola o contexto de navegação — previne ataques Spectre/cross-origin leaks
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-inline necessário para Next.js inline styles; unsafe-eval removido.
      // wasm-unsafe-eval liberado só pra WebAssembly.instantiate (Tesseract.js no /leitor) —
      // mais restrito que unsafe-eval, não permite eval()/Function() arbitrário.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      // Tesseract.js cria o worker a partir de um blob: URL (padrão do bundler)
      "worker-src 'self' blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  devIndicators: false,
  // Em desenvolvimento o Next só atende requisições vindas do host com que foi
  // iniciado (localhost); qualquer outra origem é barrada nos assets de dev.
  // Sem isto, abrir o app pelo IP da rede — que é como se testa a câmera no
  // celular — carrega a página mas quebra o HMR e os chunks de /_next.
  // Vale só em `next dev`; o build de produção ignora esta lista.
  // O IP vem do DHCP: se a rede mudar, atualize aqui (ipconfig / hostname -I).
  allowedDevOrigins: ['192.168.18.74'],
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }]
  },
};

export default nextConfig;
