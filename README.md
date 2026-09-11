# Auth Service

Microservicio de autenticación centralizado. Emite tokens JWT firmados con RS256 y expone la llave pública vía JWKS para que otros servicios los validen de forma independiente, sin necesidad de llamar a este servicio en cada petición.

## Stack

- **TypeScript + NestJS**
- **PostgreSQL** con TypeORM
- **JWT firmado con RS256** (par de llaves asimétrico pública/privada)
- **Docker** (PostgreSQL en desarrollo)

## Arquitectura y decisiones de diseño

### ¿Por qué RS256 y no HS256?

Con HS256 (simétrico), la misma llave que firma el token también lo valida — si quieres que otro microservicio valide tokens, tendrías que compartirle esa llave secreta, lo que la convierte en un secreto distribuido entre servicios.

Con RS256 (asimétrico), este servicio es el **único** que tiene la llave privada (firma) y **cualquier** otro servicio puede obtener la llave pública (verifica) sin ningún secreto compartido. Esto permite:

- Escalar a nuevos microservicios sin coordinar secretos.
- Rotar la llave privada sin distribuir nada manualmente a los consumidores (solo actualizan su caché del JWKS).
- Que un servicio comprometido que solo *valida* tokens nunca pueda *emitir* tokens válidos.

### ¿Por qué JWKS en vez de validar contra este servicio en cada request?

Este servicio expone `GET /.well-known/jwks.json` (formato estándar RFC 7517). Cualquier microservicio consumidor:

1. Descarga la llave pública una vez y la cachea.
2. Valida la firma del JWT localmente, sin red, en cada petición.
3. Solo vuelve a consultar el JWKS si cambia el `kid` (rotación de llaves) o expira el caché.

Esto evita que el Auth Service se convierta en un punto único de fallo o cuello de botella — si se cae, los servicios que ya tienen la llave en caché siguen validando tokens sin problema (aunque no puedan emitir tokens nuevos hasta que vuelva).

### Llaves generadas una sola vez, no al arrancar

Las llaves RSA se generan con un script aparte (`scripts/generate-keys.ts`), **no** en cada arranque del servicio. Si se regeneraran al iniciar, cada reinicio invalidaría todos los tokens emitidos previamente (el `kid` y la llave pública cambiarían), rompiendo cualquier sesión activa. Se generan una vez y se guardan como variables de entorno (`.env` en local, secret en Docker/orquestador en producción).

### Preparado para roles sin romper compatibilidad

El payload del JWT incluye un claim `roles` opcional desde el diseño inicial, aunque hoy no se usa:

```json
{ "sub": "uuid", "email": "user@example.com", "roles": ["ADMIN"] }
```

Los servicios consumidores pueden mapear este claim (por ejemplo, con `JwtGrantedAuthoritiesConverter` en Spring Security) desde ahora. Cuando se activen roles reales, los tokens simplemente empiezan a traer el campo poblado — ningún consumidor existente necesita cambios para seguir funcionando.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | Crea un usuario y devuelve `accessToken` + `refreshToken` |
| `POST` | `/auth/login` | Autentica y devuelve `accessToken` + `refreshToken` |
| `POST` | `/auth/refresh` | Renueva el `accessToken` a partir de un `refreshToken` válido |
| `GET` | `/.well-known/jwks.json` | Expone la llave pública en formato JWK para validación externa |

### Ejemplo: registro

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Str0ngPass!"
}
```

Respuesta:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

- `accessToken`: expira en 15 minutos, se envía como `Authorization: Bearer <token>` a los servicios protegidos.
- `refreshToken`: expira en 7 días, se usa solo contra `/auth/refresh` para obtener un nuevo `accessToken`.

## Setup local

### 1. Levantar PostgreSQL

```bash
docker compose up -d
```

### 2. Generar las llaves RSA (solo la primera vez)

```bash
npx ts-node scripts/generate-keys.ts
```

Copia el `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` (en base64) que imprime el script a tu `.env`.

### 3. Variables de entorno

```env
DATABASE_URL=postgresql://auth_user:auth_pass@localhost:5432/authdb
JWT_PRIVATE_KEY=<base64>
JWT_PUBLIC_KEY=<base64>
JWT_KID=auth-service-key-1
```

### 4. Instalar y correr

```bash
npm install
npm run start:dev
```

## Integración desde otro microservicio

Cualquier servicio que necesite validar estos tokens solo necesita apuntar al JWKS — no requiere compartir ningún secreto con este servicio.

### Ejemplo: Spring Boot (Java)

```properties
spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:3000/.well-known/jwks.json
```

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
        .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
    return http.build();
}
```

Con esto, Spring Security valida la firma RS256 de cada request de forma local, cacheando la llave pública tras la primera consulta al JWKS.

## Roadmap

- [ ] Activar claim `roles` con lógica de autorización real
- [ ] Endpoint de logout / revocación (incrementando `tokenVersion`)
- [ ] Dockerfile propio del servicio (hoy solo Postgres está dockerizado)
- [ ] Rotación de llaves con soporte multi-`kid` en el JWKS


<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
