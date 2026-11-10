import cds from '@sap/cds';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { GET } = cds.test('serve', '--project', import.meta.dirname + '/..', '--with-mocks', '--in-memory');

describe('Arranque', () => {
  it('ReporteService responde y sirve datos mock', async () => {
    const { status, data } = await GET('/odata/v4/reporte/Conexiones', { auth: { username: 'alice', password: '' } });
    assert.equal(status, 200);
    assert.ok(data.value.length > 0, 'se esperaban datos mock');
  });
});
