import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-in-prod')

export type AuthUser = { userId: string; email: string }

export const authMiddleware = createMiddleware<{
  Variables: { user: AuthUser }
}>(async (c, next) => {
  const authorization = c.req.header('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  const token = authorization.slice(7)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    c.set('user', { userId: payload.sub as string, email: payload.email as string })
  } catch {
    throw new HTTPException(401, { message: 'Invalid or expired token' })
  }

  await next()
})
