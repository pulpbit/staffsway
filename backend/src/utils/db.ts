import type { Env } from '../types'

export const getDb = (env: Env): D1Database => env.DB
