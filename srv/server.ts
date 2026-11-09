import cds from '@sap/cds';

// R10 / D11: los mensajes al usuario salen siempre en español, aunque el navegador
// pida otro idioma. CAP respeta un `req.locale` ya asignado (ver @sap/cds/lib/i18n/locale.js).
cds.on('bootstrap', app => {
  app.use((req, _res, next) => {
    (req as typeof req & { locale: string }).locale = 'es';
    next();
  });
});

export default cds.server;
