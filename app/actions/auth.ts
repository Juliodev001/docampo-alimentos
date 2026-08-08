'use server'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSession, deleteSession } from '@/lib/session'

export async function login(state: { error?: string } | undefined, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // Checkbox "Lembrar-me": vem 'on' quando marcado, ausente quando não.
  const lembrar = formData.get('lembrar') === 'on'

  if (!email || !password) return { error: 'Preencha todos os campos.' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: 'E-mail ou senha incorretos.' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'E-mail ou senha incorretos.' }

  await createSession(user.id, user.name, user.email, user.role, lembrar)
  redirect('/')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

export async function register(state: { error?: string } | undefined, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'Preencha todos os campos.' }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return { error: 'E-mail já cadastrado.' }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, email, password: hashed } })

  await createSession(user.id, user.name, user.email, user.role)
  redirect('/')
}
