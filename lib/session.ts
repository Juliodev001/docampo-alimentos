import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secretKey = process.env.SESSION_SECRET!
const encodedKey = new TextEncoder().encode(secretKey)

type SessionPayload = { userId: string; name: string | null; email: string; role: string; expiresAt: Date }

export async function encrypt(payload: SessionPayload, expiraEm: string | number | Date = '7d') {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiraEm)
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ['HS256'] })
    return payload as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(
  userId: string,
  name: string | null,
  email: string,
  role: string,
  lembrar = true,
) {
  // "Lembrar-me" marcado: cookie persistente por 30 dias — o usuário continua
  // conectado mesmo fechando o navegador. Desmarcado: cookie de SESSÃO (sem
  // expires), que o navegador apaga ao ser fechado; o JWT recebe validade de 1
  // dia como teto de segurança caso o cookie sobreviva.
  const dias = lembrar ? 30 : 1
  const expiresAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, name, email, role, expiresAt }, `${dias}d`)
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.HTTPS === 'true',
    ...(lembrar ? { expires: expiresAt } : {}),
    sameSite: 'lax',
    path: '/',
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function getSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  return decrypt(session)
}
