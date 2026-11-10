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
    { $Type: 'UI.ReferenceFacet', ID: 'idAirportTo',   Label: 'Aeropuerto Destino', Target: '@UI.DataPoint#tqAirportTo'   },
    // R14 / D47: totales de los vuelos de la conexión (campos virtual que calcula srv/service.ts)
    { $Type: 'UI.ReferenceFacet', ID: 'idTotalOcupados',  Label: 'Asientos ocupados', Target: '@UI.DataPoint#tqTotalOcupados'  },
    { $Type: 'UI.ReferenceFacet', ID: 'idTotalCapacidad', Label: 'Capacidad',         Target: '@UI.DataPoint#tqTotalCapacidad' }
  ],

  UI.DataPoint #tqTotalOcupados  : { Value: TotalAsientosOcupados, Title: 'Asientos ocupados' },
  UI.DataPoint #tqTotalCapacidad : { Value: TotalCapacidad,        Title: 'Capacidad'         },

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
  // R14 / D47: totales en la cabecera del detalle (virtual en srv/service.cds)
  TotalAsientosOcupados @Common.Label: 'Asientos ocupados'
                        @Common.Heading: 'Ocupados'
                        @Common.QuickInfo: 'Total de asientos ocupados en los vuelos de la conexión';
  TotalCapacidad        @Common.Label: 'Capacidad'
                        @Common.Heading: 'Capacidad'
                        @Common.QuickInfo: 'Total de asientos disponibles en los vuelos de la conexión';
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

// ---------------------------------------------------------------------------
// D38 / D47: los totales de SeatsOccupied y SeatsMax van en la cabecera de la conexión (R14), no al pie
// de la tabla de vuelos: este Gateway no soporta concat, top ni $count en $apply, que la tabla analítica
// necesita. Por eso Vuelos NO lleva ApplySupported ni @Analytics.Measure (lo que activa la analítica de
// Fiori) y su tabla es responsive. La alternativa con AnalyticalTable queda documentada en D46.
// Sí se mantienen los agregados predefinidos (CustomAggregate + Aggregation.default: #SUM), iguales a los
// del RAP desde D45: sin ellos CAP no entiende `aggregate(SeatsOccupied)` en las lecturas con $apply que
// reenvía al RAP (D43).
// ---------------------------------------------------------------------------
annotate service.Vuelos with @(
  Aggregation.CustomAggregate #SeatsOccupied : 'Edm.Int32',
  Aggregation.CustomAggregate #SeatsMax      : 'Edm.Int32'
) {
  SeatsOccupied @Aggregation.default: #SUM;
  SeatsMax      @Aggregation.default: #SUM;
};

// ---------------------------------------------------------------------------
// D50: value help de aeropuertos. El RAP los declara con @Common.ValueListReferences, que apuntan a
// otro servicio ($metadata del F4) que la app no puede leer a través de CAP: se anulan y se define un
// @Common.ValueList propio sobre la entidad Aeropuertos de ReporteService (columna "Value help" de la
// tabla de semántica). R11 lo verifica. D52: con SearchSupported, Fiori manda la búsqueda del diálogo como
// $search (sin él, escribir en la búsqueda no filtraba, R8 6b).
// ---------------------------------------------------------------------------
annotate service.Conexiones with {
  AirportFromId @Common.ValueListReferences: null
                @Common.ValueList: {
                  Label         : 'Aeropuertos',
                  CollectionPath: 'Aeropuertos',
                  SearchSupported: true, // D52: la búsqueda del diálogo se envía como $search
                  Parameters    : [
                    { $Type: 'Common.ValueListParameterInOut',       LocalDataProperty: AirportFromId, ValueListProperty: 'AirportID' },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'        },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'        },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryCode' }
                  ]
                };
  AirportToId   @Common.ValueListReferences: null
                @Common.ValueList: {
                  Label         : 'Aeropuertos',
                  CollectionPath: 'Aeropuertos',
                  SearchSupported: true, // D52: la búsqueda del diálogo se envía como $search
                  Parameters    : [
                    { $Type: 'Common.ValueListParameterInOut',       LocalDataProperty: AirportToId, ValueListProperty: 'AirportID' },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'Name'        },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'City'        },
                    { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryCode' }
                  ]
                };
};

// ---------------------------------------------------------------------------
// Aeropuertos — columnas del diálogo del value help y textos en español (D40, D50). El F4 del RAP trae
// el LineItem con el alias SAP__UI (D22) y los textos en inglés.
// ---------------------------------------------------------------------------
annotate service.Aeropuertos with @(
  UI.LineItem : [
    { $Type: 'UI.DataField', Label: 'Aeropuerto',  Value: AirportID   },
    { $Type: 'UI.DataField', Label: 'Nombre',      Value: Name        },
    { $Type: 'UI.DataField', Label: 'Ciudad',      Value: City        },
    { $Type: 'UI.DataField', Label: 'País/región', Value: CountryCode }
  ]
) {
  AirportID       @Common.Label: 'Aeropuerto'
                  @Common.Heading: 'Aeropuerto'
                  @Common.QuickInfo: 'Código del aeropuerto';
  Name            @Common.Label: 'Nombre'
                  @Common.Heading: 'Nombre'
                  @Common.QuickInfo: 'Nombre del aeropuerto';
  City            @Common.Label: 'Ciudad'
                  @Common.Heading: 'Ciudad'
                  @Common.QuickInfo: 'Ciudad del aeropuerto';
  // D51: sin el F4 de país (I_CountryVH no se expone): se anula el ValueListMapping del RAP.
  CountryCode     @Common.Label: 'País/región'
                  @Common.Heading: 'País/región'
                  @Common.QuickInfo: 'Clave del país o región del aeropuerto'
                  @Common.ValueListMapping.Label: null
                  @Common.ValueListMapping.CollectionPath: null
                  @Common.ValueListMapping.Parameters: null;
  CountryCodeText @Common.Label: 'Nombre país/región'
                  @Common.Heading: 'País/región'
                  @Common.QuickInfo: 'Nombre del país o región';
};
