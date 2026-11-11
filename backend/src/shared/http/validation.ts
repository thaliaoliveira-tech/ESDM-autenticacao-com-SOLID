import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationError,
  type ValidationOptions,
} from 'class-validator';
import { isIsoDate, isTimeOfDay, isValidTimezone } from '../domain/dates';

/** Achata erros aninhados ("dailyReminder.time") preservando o caminho do campo. */
function flatten(
  errors: ValidationError[],
  parent = '',
): Array<{ field: string; messages: string[] }> {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {});
    return [
      ...(own.length > 0 ? [{ field, messages: own }] : []),
      ...flatten(error.children ?? [], field),
    ];
  });
}

/**
 * Pipe global: mesmo em main.ts e nos testes E2E. A resposta de erro indica o
 * primeiro campo invalido (`field`), para o app destacar o campo certo.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const flat = flatten(errors);
      return new BadRequestException({
        message: flat.flatMap((entry) => entry.messages),
        field: flat[0]?.field,
      });
    },
  });
}

/** Remove espacos das pontas de strings (outros tipos passam intactos para a validacao). */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Normaliza e-mails: sem espacos e em minusculas. */
export const NormalizeEmail = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

/** String vazia vira `null`, permitindo limpar um campo opcional em um PATCH. */
export const EmptyToNull = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

function simpleValidator(
  name: string,
  test: (value: unknown) => boolean,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name,
      target: target.constructor,
      propertyName: propertyName as string,
      options,
      validator: { validate: test },
    });
  };
}

export const IsIsoDate = (options?: ValidationOptions): PropertyDecorator =>
  simpleValidator('isIsoDate', isIsoDate, {
    message: '$property deve ser uma data valida no formato AAAA-MM-DD.',
    ...options,
  });

export const IsTimeOfDay = (options?: ValidationOptions): PropertyDecorator =>
  simpleValidator('isTimeOfDay', isTimeOfDay, {
    message: '$property deve estar no formato HH:MM (24 horas).',
    ...options,
  });

export const IsTimezone = (options?: ValidationOptions): PropertyDecorator =>
  simpleValidator('isTimezone', isValidTimezone, {
    message: '$property deve ser um fuso horario IANA valido (ex.: America/Sao_Paulo).',
    ...options,
  });

/** O valor precisa ser igual ao de outra propriedade (confirmacao de senha). */
export function Matches(property: string, options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'matchesProperty',
      target: target.constructor,
      propertyName: propertyName as string,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [related] = args.constraints as [string];
          return value === (args.object as Record<string, unknown>)[related];
        },
      },
    });
  };
}
