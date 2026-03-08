import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth'
import { closetRoutes } from './routes/closet'
import { coordinateRoutes } from './routes/coordinate'
import { productRoutes } from './routes/product'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [
      process.env.WEB_URL ?? 'http://localhost:3000',
      'http://localhost:8081', // Expo dev
    ],
    credentials: true,
  })
)

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/auth', authRoutes)
app.route('/closet', closetRoutes)
app.route('/coordinates', coordinateRoutes)
app.route('/products', productRoutes)

const port = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API server running on http://localhost:${port}`)
})

export default app
