/* checksum : 84eb64413cdee3c7c08442d6093b61b0 */
@cds.external : true
@CodeList.UnitsOfMeasure.Url : '../../../../default/iwbep/common/0001/$metadata'
@CodeList.UnitsOfMeasure.CollectionPath : 'UnitsOfMeasure'
@CodeList.CurrencyCodes.Url : '../../../../default/iwbep/common/0001/$metadata'
@CodeList.CurrencyCodes.CollectionPath : 'Currencies'
@Aggregation.ApplySupported.Transformations : [ 'aggregate', 'groupby', 'filter' ]
@Aggregation.ApplySupported.Rollup : #None
@Common.ApplyMultiUnitBehaviorForSortingAndFiltering : true
@Capabilities.FilterFunctions : [
  'eq',
  'ne',
  'gt',
  'ge',
  'lt',
  'le',
  'and',
  'or',
  'contains',
  'startswith',
  'endswith',
  'any',
  'all'
]
@Capabilities.SupportedFormats : [ 'application/json', 'application/pdf' ]
@PDF.Features.DocumentDescriptionReference : '../../../../default/iwbep/common/0001/$metadata'
@PDF.Features.DocumentDescriptionCollection : 'MyDocumentDescriptions'
@PDF.Features.ArchiveFormat : true
@PDF.Features.Border : true
@PDF.Features.CoverPage : true
@PDF.Features.FitToPage : true
@PDF.Features.FontName : true
@PDF.Features.FontSize : true
@PDF.Features.Margin : true
@PDF.Features.Padding : true
@PDF.Features.Signature : true
@PDF.Features.HeaderFooter : true
@PDF.Features.ResultSizeDefault : 20000
@PDF.Features.ResultSizeMaximum : 20000
@Capabilities.KeyAsSegmentSupported : true
@Capabilities.AsynchronousRequestsSupported : true
service ZMAKS_SB_CONEXIONES {
  @cds.external : true
  @cds.persistence.skip : true
  @Common.Label : 'Interface View para conexiones'
  @UI.DataPoint#tqAirportFrom.Value : AirportFromId
  @UI.DataPoint#tqAirportFrom.Title : 'Aeropuerto Salida'
  @UI.DataPoint#tqAirportTo.Value : AirportToId
  @UI.DataPoint#tqAirportTo.Title : 'Aeropuerto Destino'
  @UI.Facets : [
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Detalles de conexión',
      ID: 'idConnection',
      Target: @UI.Identification
    },
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Detalles de vuelos',
      ID: 'idFlight',
      Target: _Flight.![@UI].LineItem
    }
  ]
  @UI.HeaderFacets : [
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Aeropuerto Salida',
      ID: 'idAirportFrom',
      Target: @UI.![DataPoint#tqAirportFrom]
    },
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Aeropuerto Destino',
      ID: 'idAirportTo',
      Target: @UI.![DataPoint#tqAirportTo]
    }
  ]
  @UI.HeaderInfo.TypeName : 'Conexión'
  @UI.HeaderInfo.TypeNamePlural : 'Conexiones'
  @UI.HeaderInfo.Title.$Type : 'SAP__UI.DataField'
  @UI.HeaderInfo.Title.Value : CarrierName
  @UI.HeaderInfo.Description.$Type : 'SAP__UI.DataField'
  @UI.HeaderInfo.Description.Value : ConnectionId
  @UI.Identification : [
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Hora salida',
      Value: DepartureTime
    },
    { $Type: 'SAP__UI.DataField', Label: 'Hora llegada', Value: ArrivalTime },
    { $Type: 'SAP__UI.DataField', Label: 'Distancia', Value: Distance },
    { $Type: 'SAP__UI.DataField', Label: 'Medida', Value: DistanceUnit }
  ]
  @UI.LineItem : [
    { $Type: 'SAP__UI.DataField', Label: 'Id aerolínea', Value: CarrierId },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Número vuelo',
      Value: ConnectionId
    },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Aeropuerto salida',
      Value: AirportFromId
    },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Aeropuerto destino',
      Value: AirportToId
    },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Hora salida',
      Value: DepartureTime
    },
    { $Type: 'SAP__UI.DataField', Label: 'Hora llegada', Value: ArrivalTime },
    { $Type: 'SAP__UI.DataField', Label: 'Distancia', Value: Distance },
    { $Type: 'SAP__UI.DataField', Label: 'Medida', Value: DistanceUnit }
  ]
  @UI.SelectionFields : [ 'AirportFromId', 'AirportToId' ]
  @Capabilities.NavigationRestrictions.RestrictedProperties : [
    {
      NavigationProperty: _Flight,
      InsertRestrictions: { Insertable: false }
    }
  ]
  @Capabilities.SearchRestrictions.Searchable : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions : #phrase
  @Capabilities.InsertRestrictions.Insertable : false
  @Capabilities.DeleteRestrictions.Deletable : false
  @Capabilities.UpdateRestrictions.Updatable : false
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported : true
  entity Conexiones {
    @Common.Label : 'Id aerolínea'
    @Common.Text : CarrierId_Text
    @Common.IsUpperCase : true
    @Common.Heading : 'Airline ID'
    @Common.QuickInfo : 'Flight Reference Scenario: Carrier ID'
    key CarrierId : String(3) not null;
    @Core.Computed : true
    @Common.Label : 'Airline Name'
    @Common.Heading : 'Airline'
    @Common.QuickInfo : 'Flight Reference Scenario: Carrier Name'
    CarrierId_Text : String(40) not null;
    @Common.Label : 'Número vuelo'
    @Common.IsDigitSequence : true
    @Common.Heading : 'Flight No.'
    @Common.QuickInfo : 'Flight Reference Scenario: Connection ID'
    key ConnectionId : String(4) not null;
    @Common.Label : 'Aeropuerto salida'
    @Common.IsUpperCase : true
    @Common.ValueListReferences : [
      '../../../../srvd_f4/dmo/i_airport_stdvh/0001;ps=''srvd-zmaks_sd_conexiones-0001'';va=''com.sap.gateway.srvd.zmaks_sd_conexiones.v0001.et-zmaks_i_conexiones.airportfromid''/$metadata'
    ]
    @Common.Heading : 'Departure'
    @Common.QuickInfo : 'Flight Reference Scenario: From Airport'
    AirportFromId : String(3) not null;
    @Common.Label : 'Aeropuerto destino'
    @Common.IsUpperCase : true
    @Common.ValueListReferences : [
      '../../../../srvd_f4/dmo/i_airport_stdvh/0001;ps=''srvd-zmaks_sd_conexiones-0001'';va=''com.sap.gateway.srvd.zmaks_sd_conexiones.v0001.et-zmaks_i_conexiones.airporttoid''/$metadata'
    ]
    @Common.Heading : 'Destination'
    @Common.QuickInfo : 'Flight Reference Scenario: To Airport'
    AirportToId : String(3) not null;
    @Common.Label : 'Hora salida'
    @Common.Heading : 'Departure Time'
    @Common.QuickInfo : 'Flight Reference Scenario: Departure Time'
    DepartureTime : Time not null;
    @Common.Label : 'Hora llegada'
    @Common.Heading : 'Arrival'
    @Common.QuickInfo : 'Flight Reference Scenario: Arrival Time'
    ArrivalTime : Time not null;
    @Common.Label : 'Distancia'
    @Common.Heading : 'Flight Distance'
    @Common.QuickInfo : 'Flight Reference Scenario: Flight Distance'
    Distance : Integer not null;
    @Common.IsUnit : true
    @Common.Label : 'Medida'
    @Common.Heading : 'UM'
    @Common.QuickInfo : 'Unidad de medida'
    DistanceUnit : String(3) not null;
    @Common.Label : 'Nombre aerolínea'
    @Common.Heading : 'Airline'
    @Common.QuickInfo : 'Flight Reference Scenario: Carrier Name'
    CarrierName : String(40) not null;
    _Flight : Association to many Vuelos {  };
  };

  @cds.external : true
  @cds.persistence.skip : true
  @Common.Label : 'Interface view para Vuelos'
  @UI.DataPoint#tqFlightNumber.Value : ConnectionId
  @UI.DataPoint#tqFlightNumber.Title : 'Número vuelo'
  @UI.DataPoint#tqFlightDate.Value : FlightDate
  @UI.DataPoint#tqFlightDate.Title : 'Fecha vuelo'
  @UI.Facets : [
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Detalle vuelo',
      ID: 'idFlight',
      Target: @UI.Identification
    }
  ]
  @UI.HeaderFacets : [
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Número vuelo',
      ID: 'idFlightNumber',
      Target: @UI.![DataPoint#tqFlightNumber]
    },
    {
      $Type: 'SAP__UI.ReferenceFacet',
      Label: 'Fecha vuelo',
      ID: 'idFlightDate',
      Target: @UI.![DataPoint#tqFlightDate]
    }
  ]
  @UI.HeaderInfo.TypeName : 'Vuelo'
  @UI.HeaderInfo.TypeNamePlural : 'Vuelos'
  @UI.HeaderInfo.Title.$Type : 'SAP__UI.DataField'
  @UI.HeaderInfo.Title.Value : CarrierName
  @UI.Identification : [
    { $Type: 'SAP__UI.DataField', Label: 'Precio vuelo', Value: Price },
    { $Type: 'SAP__UI.DataField', Label: 'Tipo vuelo', Value: PlaneTypeId },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Capacidad máxima',
      Value: SeatsMax
    },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Ocupación asientos',
      Value: SeatsOccupied
    }
  ]
  @UI.LineItem : [
    { $Type: 'SAP__UI.DataField', Label: 'Id aerolínea', Value: CarrierId },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Número vuelo',
      Value: ConnectionId
    },
    { $Type: 'SAP__UI.DataField', Label: 'Fecha vuelo', Value: FlightDate },
    { $Type: 'SAP__UI.DataField', Label: 'Precio vuelo', Value: Price },
    { $Type: 'SAP__UI.DataField', Label: 'Tipo vuelo', Value: PlaneTypeId },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Capacidad máxima',
      Value: SeatsMax
    },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Ocupación asientos',
      Value: SeatsOccupied
    },
    {
      $Type: 'SAP__UI.DataField',
      Label: 'Nombre Aerolínea',
      Value: CarrierName
    }
  ]
  @Capabilities.SearchRestrictions.Searchable : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions : #phrase
  @Capabilities.InsertRestrictions.Insertable : false
  @Capabilities.DeleteRestrictions.Deletable : false
  @Capabilities.UpdateRestrictions.Updatable : false
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported : true
  @Capabilities.FilterRestrictions.FilterExpressionRestrictions : [ { Property: Price, AllowedExpressions: 'MultiValue' } ]
  entity Vuelos {
    @Common.Text : CarrierId_Text
    @Common.IsUpperCase : true
    @Common.Label : 'Airline ID'
    @Common.QuickInfo : 'Flight Reference Scenario: Carrier ID'
    key CarrierId : String(3) not null;
    @Core.Computed : true
    @Common.Label : 'Airline Name'
    @Common.Heading : 'Airline'
    @Common.QuickInfo : 'Flight Reference Scenario: Carrier Name'
    CarrierId_Text : String(40) not null;
    @Common.IsDigitSequence : true
    @Common.Label : 'Flight Number'
    @Common.Heading : 'Flight No.'
    @Common.QuickInfo : 'Flight Reference Scenario: Connection ID'
    key ConnectionId : String(4) not null;
    @Common.Label : 'Flight Date'
    @Common.Heading : 'Date'
    @Common.QuickInfo : 'Flight Reference Scenario: Flight Date'
    key FlightDate : Date not null;
    @Measures.ISOCurrency : CurrencyCode
    @Common.Label : 'Flight Price'
    @Common.Heading : 'Airfare'
    @Common.QuickInfo : 'Flight Reference Scenario: Flight Price'
    Price : Decimal(precision: 16) not null;
    @Common.IsCurrency : true
    @Common.Label : 'Currency Code'
    @Common.QuickInfo : 'Flight Reference Scenario: Currency Code'
    CurrencyCode : String(5) not null;
    @Common.IsUpperCase : true
    @Common.Label : 'Plane Type'
    @Common.Heading : 'Plane'
    @Common.QuickInfo : 'Flight Reference Scenario: Plane Type ID'
    PlaneTypeId : String(10) not null;
    @Common.Label : 'Maximum Capacity'
    @Common.Heading : 'Capacity'
    @Common.QuickInfo : 'Flight Reference Scenario: Plane Seats Max'
    SeatsMax : Integer not null;
    @Common.Label : 'Occupied Seats'
    @Common.Heading : 'Occupied'
    @Common.QuickInfo : 'Flight Reference Scenario: Plane Seats Occupied'
    SeatsOccupied : Integer not null;
    @Common.Label : 'Airline Name'
    @Common.Heading : 'Airline'
    @Common.QuickInfo : 'Flight Reference Scenario: Carrier Name'
    CarrierName : String(40) not null;
  };
};

