// Gancho nativo de CAP (`cds serve --with-mocks`): carga este archivo después de levantar los
// servicios, solo si `cds.env.features.test_mocks` (false en producción). CAP busca exactamente
// `test/mocked.js`, por eso es .js; la lógica está en TypeScript en `test/mock/rap.ts` (D25).
import { activar } from './mock/rap.ts';

activar();
