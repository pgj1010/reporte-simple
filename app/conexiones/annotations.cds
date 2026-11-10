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
    { $Type: 'UI.DataField', Label: 'Distancia',          Value: Distance      },
    { $Type: 'UI.DataField', Label: 'Medida',             Value: DistanceUnit  }
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
    { $Type: 'UI.DataField', Label: 'Distancia',    Value: Distance      },
    { $Type: 'UI.DataField', Label: 'Medida',       Value: DistanceUnit  }
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

// D24 / D11: el RAP trae las etiquetas de Vuelos en inglés. "Etiqueta" de la tabla = @Common.Label.
annotate service.Vuelos with {
  CarrierId     @Common.Label: 'Id aerolínea';
  ConnectionId  @Common.Label: 'Número vuelo';
  FlightDate    @Common.Label: 'Fecha vuelo';
  Price         @Common.Label: 'Precio vuelo';
  PlaneTypeId   @Common.Label: 'Tipo vuelo';
  SeatsMax      @Common.Label: 'Capacidad máxima';
  SeatsOccupied @Common.Label: 'Ocupación asientos';
  CarrierName   @Common.Label: 'Nombre aerolínea';
};
