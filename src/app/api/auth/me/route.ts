import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  return NextResponse.json({ ok: true, user: session })
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('charis_token')
  return response
}
