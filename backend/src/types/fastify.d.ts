import '@fastify/jwt'

declare module 'fastify' {
    interface FastifyRequest {
        jwtVerify(): Promise<void>
        user: {
            sub: string
            role: 'admin' | 'operator'
            name: string
        }
    }
}
