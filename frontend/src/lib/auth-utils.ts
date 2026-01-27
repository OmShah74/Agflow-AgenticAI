import { randomBytes } from 'crypto'

export async function generateUserApiKey(userId?: string, email?: string) {
    const randomPart = randomBytes(24).toString('hex')
    return `sk-agflow-${randomPart}`
}
