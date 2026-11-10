using ReporteService as service from '../../srv/service';

// Anotaciones @UI del reporte, generadas desde la tabla "Semántica del reporte" de SPEC.md (D8).
// El RAP las trae con el alias SAP__UI, que CAP no reconoce (D22): aquí se redefinen con tipos UI.*.
// Si cambia la tabla de semántica: actualizar este archivo y el test R11 (test/r11-semantica.test.ts).
// No editar srv/external.

// ---------------------------------------------------------------------------
// Conexiones — List Report y página de detalle
// ---------------------------------------------------------------------------
annotate service.Conexiones with @(
  UI.LineItem               : [
    { $Type: 'UI.DataField', Label: 'Id aerolínea',       Value: CarrierId     },
    { $Type: 'UI.DataField', Label: 'Número vuelo',       Value: ConnectionId  },
    { $Type: 'UI.DataField', Label: 'Aeropuerto salida',  Value: AirportFromId },
    { $Type: 'UI.DataField', Label: 'Aeropuerto destino', Value: AirportToId   },
    { $Type: 'UI.DataField', Label: 'Hora salida',        Value: DepartureTime },
    { $Type: 'UI.DataField', Label: 'Hora llegada',       Value: ArrivalTime   },
    { $Type: 'UI.DataField', Label: 'Distancia',          Value: Distance      }
    // D39: sin "Medida" (DistanceUnit): la unidad se ve junto a la distancia (D23)
  ],

  UI.HeaderInfo.Title       : { $Type: 'UI.DataField', Value: CarrierName  },
  UI.HeaderInfo.Description : { $Type: 'UI.DataField', Value: ConnectionId },

  UI.HeaderFacets           : [
    { $Type: 'UI.ReferenceFacet', ID: 'idAirportFrom', Label: 'Aeropuerto Salida',  Target: '@UI.DataPoint#tqAirportFrom' },
    { $Type: 'UI.ReferenceFacet', ID: 'idAirportTo',   Label: 'Aeropuerto Destino', Target: '@UI.DataPoint#tqAirportTo'   }
  ],

  UI.Facets                 : [
    { $Type: 'UI.ReferenceFacet', ID: 'idConnection', Label: 'Detalles de conexión', Target: '@UI.Identification'   },
    { $Type: 'UI.ReferenceFacet', ID: 'idFlight',     Label: 'Detalles de vuelos',   Target: '_Flight/@UI.LineItem' }
  ],

  UI.Identification         : [
    { $Type: 'UI.DataField', Label: 'Hora salida',  Value: DepartureTime },
    { $Type: 'UI.DataField', Label: 'Hora llegada', Value: ArrivalTime   },
    { $Type: 'UI.DataField', Label: 'Distancia',    Value: Distance      }
    // D39: sin "Medida" (DistanceUnit): la unidad se ve junto a la distancia (D23)
  ]
);

// ---------------------------------------------------------------------------
// Vuelos — tabla de la sección "Detalles de vuelos" y página de detalle
// ---------------------------------------------------------------------------
annotate service.Vuelos with @(
  UI.LineItem         : [
    { $Type: 'UI.DataField', Label: 'Id aerolínea',       Value: CarrierId     },
    { $Type: 'UI.DataField', Label: 'Número vuelo',       Value: ConnectionId  },
    { $Type: 'UI.DataField', Label: 'Fecha vuelo',        Value: FlightDate    },
    { $Type: 'UI.DataField', Label: 'Precio vuelo',       Value: Price         },
    { $Type: 'UI.DataField', Label: 'Tipo vuelo',         Value: PlaneTypeId   },
    { $Type: 'UI.DataField', Label: 'Capacidad máxima',   Value: SeatsMax      },
    { $Type: 'UI.DataField', Label: 'Ocupación asientos', Value: SeatsOccupied },
    { $Type: 'UI.DataField', Label: 'Nombre aerolínea',   Value: CarrierName   }
  ],

  UI.HeaderInfo.Title : { $Type: 'UI.DataField', Value: CarrierName },

  UI.HeaderFacets     : [
    { $Type: 'UI.ReferenceFacet', ID: 'idFlightNumber', Label: 'Número vuelo', Target: '@UI.DataPoint#tqFlightNumber' },
    { $Type: 'UI.ReferenceFacet', ID: 'idFlightDate',   Label: 'Fecha vuelo',  Target: '@UI.DataPoint#tqFlightDate'   }
  ],

  UI.Facets           : [
    { $Type: 'UI.ReferenceFacet', ID: 'idFlight', Label: 'Detalle vuelo', Target: '@UI.Identification' }
  ],

  UI.Identification   : [
    { $Type: 'UI.DataField', Label: 'Precio vuelo',       Value: Price         },
    { $Type: 'UI.DataField', Label: 'Tipo vuelo',         Value: PlaneTypeId   },
    { $Type: 'UI.DataField', Label: 'Capacidad máxima',   Value: SeatsMax      },
    { $Type: 'UI.DataField', Label: 'Ocupación asientos', Value: SeatsOccupied }
  ]
);

// ---------------------------------------------------------------------------
// Elementos: unidades y etiquetas de campo (@Common.Label) según la tabla
// ---------------------------------------------------------------------------

// D23: el RAP no declara la unidad de Distance.
annotate service.Conexiones with {
  Distance @Measures.Unit: DistanceUnit;
};

// D24 / D40 / D11: textos de cada campo en español, desde la tabla de semántica (columnas Etiqueta,
// Encabezado y Ayuda). El RAP los trae en inglés ("Airline Name", "Airfare", "Flight Reference Scenario: …").
// Incluye los campos que no son columna (CarrierId_Text, CurrencyCode, …): R11 exige que estén todos.
annotate service.Conexiones with {
  CarrierId      @Common.Label: 'Id aerolínea'
                 @Common.Heading: 'Id aerolínea'
                 @Common.QuickInfo: 'Código de la aerolínea';
  CarrierId_Text @Common.Label: 'Aerolínea'
                 @Common.Heading: 'Aerolínea'
                 @Common.QuickInfo: 'Nombre de la aerolínea (texto del Id aerolínea)';
  ConnectionId   @Common.Label: 'Número vuelo'
                 @Common.Heading: 'N.º vuelo'
                 @Common.QuickInfo: 'Número de la conexión';
  AirportFromId  @Common.Label: 'Aeropuerto salida'
                 @Common.Heading: 'Salida'
                 @Common.QuickInfo: 'Código del aeropuerto de salida';
  AirportToId    @Common.Label: 'Aeropuerto destino'
                 @Common.Heading: 'Destino'
                 @Common.QuickInfo: 'Código del aeropuerto de destino';
  DepartureTime  @Common.Label: 'Hora salida'
                 @Common.Heading: 'Hora salida'
                 @Common.QuickInfo: 'Hora de salida del vuelo';
  ArrivalTime    @Common.Label: 'Hora llegada'
                 @Common.Heading: 'Hora llegada'
                 @Common.QuickInfo: 'Hora de llegada del vuelo';
  Distance       @Common.Label: 'Distancia'
                 @Common.Heading: 'Distancia'
                 @Common.QuickInfo: 'Distancia del vuelo';
  DistanceUnit   @Common.Label: 'Medida'
                 @Common.Heading: 'Unidad'
                 @Common.QuickInfo: 'Unidad de medida de la distancia';
  CarrierName    @Common.Label: 'Nombre aerolínea'
                 @Common.Heading: 'Aerolínea'
                 @Common.QuickInfo: 'Nombre de la aerolínea';
};

annotate service.Vuelos with {
  CarrierId      @Common.Label: 'Id aerolínea'
                 @Common.Heading: 'Id aerolínea'
                 @Common.QuickInfo: 'Código de la aerolínea';
  CarrierId_Text @Common.Label: 'Aerolínea'
                 @Common.Heading: 'Aerolínea'
                 @Common.QuickInfo: 'Nombre de la aerolínea (texto del Id aerolínea)';
  ConnectionId   @Common.Label: 'Número vuelo'
                 @Common.Heading: 'N.º vuelo'
                 @Common.QuickInfo: 'Número de la conexión';
  FlightDate     @Common.Label: 'Fecha vuelo'
                 @Common.Heading: 'Fecha'
                 @Common.QuickInfo: 'Fecha del vuelo';
  Price          @Common.Label: 'Precio vuelo'
                 @Common.Heading: 'Precio'
                 @Common.QuickInfo: 'Precio del vuelo';
  CurrencyCode   @Common.Label: 'Moneda'
                 @Common.Heading: 'Moneda'
                 @Common.QuickInfo: 'Código de la moneda del precio';
  PlaneTypeId    @Common.Label: 'Tipo vuelo'
                 @Common.Heading: 'Avión'
                 @Common.QuickInfo: 'Tipo de avión';
  SeatsMax       @Common.Label: 'Capacidad máxima'
                 @Common.Heading: 'Capacidad'
                 @Common.QuickInfo: 'Cantidad máxima de asientos';
  SeatsOccupied  @Common.Label: 'Ocupación asientos'
                 @Common.Heading: 'Ocupados'
                 @Common.QuickInfo: 'Cantidad de asientos ocupados';
  CarrierName    @Common.Label: 'Nombre aerolínea'
                 @Common.Heading: 'Aerolínea'
                 @Common.QuickInfo: 'Nombre de la aerolínea';
};
