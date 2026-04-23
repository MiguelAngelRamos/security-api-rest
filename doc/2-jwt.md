# Secure By Default 

## Problema que motiva a implementar Secure By Default 

@UseGuards(JwtAuthGuard)

Modelo Inseguro: todo abierto por default -> proteger lo que quieres cerrar

Modelo Seguro: todo cerrado por default -> abres lo que debe ser publico

Este es el principcio **Secure By Default** Es uno de los principios fundamentales de diseño seguro reconocido por OWASP.


```typescript

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],

```

APP_GUARD es un token especial Nestjs Registra este guard y lo hace global es decir
se ejecuta antes de de cada endpoint de toda la aplicacion sin la necesidad de escribir @UseGuards()

El resultado es inmediato todos lo endpoint van exigir JWT ( un controlador nuevo creado sin decoradores queda protegido automaticamente)


## Como podemos hacer publicos aquellos endpoint que lo necesiten

```typescript
// src/common/decorators/public.decorator.ts
// @Public()
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
// {isPublic: true}
```


## En un proyecto 


```typescript
// src/auth/auth.controller.ts
@Public()           // ← pega la etiqueta isPublic: true
@Post('login')
async login(...) { ... }

@Public()           // ← ídem
@Post('register')
async register(...) { ... }

@Public()           // ← ídem — usa cookie, no JWT en header
@Post('refresh')
async refresh(...) { ... }

// logout NO tiene @Public() — lo vemos al final del bloque
@Post('logout')
async logout(...) { ... }

```

## Clase 

```typescript
// Todos los endpoints de este controller son públicos
@Public()               // ← decora la clase, no el método
@Controller('auth')
export class AuthController {
  @Post('login')
  login() { ... }       // público (hereda de la clase)

  @Post('register')
  register() { ... }    // público (hereda de la clase)

  @Post('forgot-password')
  forgotPassword() { }  // público (hereda de la clase)
}

```

## Componente JWTAUTHGUARD lectura de etiqueta del decorador mediante Reflector

```typescript


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Reflector leela metadata pegada por @Public()
    // {isPublic: true}
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // Busca a nivel de metodo @Post('login')
      context.getClass(), // Busca en clase @Controller('auth')
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```


## Flujo completo


Request llega al Sevidor -> Nest Ejecutar JwtAuthGuard (global - App_Guard)

canActivate() preguntar por medio del reflector si endpoint o clase tiene la etiqueta isPublic true