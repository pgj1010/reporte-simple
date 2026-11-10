/* checksum : bdb3a7a6a3722aa9517c3ae6fc5eac9e */
@cds.external : true
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
@PDF.Features.ResultSizeDefault : 100
@PDF.Features.ResultSizeMaximum : 5000
@Capabilities.KeyAsSegmentSupported : true
@Capabilities.AsynchronousRequestsSupported : true
service I_AIRPORT_STDVH {
  @cds.external : true
  @cds.persistence.skip : true
  @Common.Label : 'País/Región'
  @Capabilities.SearchRestrictions.Searchable : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions : #phrase
  @Capabilities.InsertRestrictions.Insertable : false
  @Capabilities.DeleteRestrictions.Deletable : false
  @Capabilities.UpdateRestrictions.Updatable : false
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported : true
  entity I_CountryVH {
    @Common.Text : Country_Text
    @Common.IsUpperCase : true
    @Common.Label : 'Clave de país/región'
    @Common.Heading : 'P/R'
    key Country : String(3) not null;
    @Core.Computed : true
    @Common.Label : 'Denomin.país/región'
    @Common.QuickInfo : 'Denominación del país/de la región'
    Country_Text : String(50) not null;
    @UI.Hidden : true
    @Common.Label : 'Denomin.país/región'
    @Common.QuickInfo : 'Denominación del país/de la región'
    Description : String(50) not null;
    @Common.IsUpperCase : true
    @Common.Label : 'Cód.ISO 3 pos.'
    @Common.Heading : 'Código ISO 3 posiciones'
    @Common.QuickInfo : 'Código ISO del país/de la región de 3 posiciones'
    CountryThreeLetterISOCode : String(3) not null;
    @Common.IsDigitSequence : true
    @Common.Label : 'Cód.ISO númer.3'
    @Common.Heading : 'Código ISO numérico 3 posiciones'
    @Common.QuickInfo : 'Código ISO del país/de la región numérico de 3 posiciones'
    CountryThreeDigitISOCode : String(3) not null;
  };

  @cds.external : true
  @cds.persistence.skip : true
  @Common.Label : 'Airport ValueHelp'
  @UI.LineItem : [
    { $Type: 'SAP__UI.DataField', Value: AirportID, @UI.Importance: #High },
    { $Type: 'SAP__UI.DataField', Value: Name, @UI.Importance: #High },
    { $Type: 'SAP__UI.DataField', Value: City, @UI.Importance: #Medium },
    {
      $Type: 'SAP__UI.DataField',
      Value: CountryCode,
      @UI.Importance: #Medium
    }
  ]
  @Capabilities.SearchRestrictions.Searchable : true
  @Capabilities.SearchRestrictions.UnsupportedExpressions : #phrase
  @Capabilities.InsertRestrictions.Insertable : false
  @Capabilities.DeleteRestrictions.Deletable : false
  @Capabilities.UpdateRestrictions.Updatable : false
  @Capabilities.UpdateRestrictions.QueryOptions.SelectSupported : true
  entity xDMOxI_Airport_StdVH {
    @Common.Text : Name
    @Common.Text.@UI.TextArrangement : #TextSeparate
    @Common.IsUpperCase : true
    @Common.Label : 'Airport ID'
    @Common.Heading : 'Airport'
    @Common.QuickInfo : 'Flight Reference Scenario: Airport ID'
    key AirportID : String(3) not null;
    @Common.Label : 'Airport Name'
    @Common.Heading : 'Airport'
    @Common.QuickInfo : 'Flight Reference Scenario: Airport Name'
    Name : String(40) not null;
    @Common.Label : 'City'
    @Common.QuickInfo : 'Flight Reference Scenario: City'
    City : String(40) not null;
    @Common.ValueListMapping.Label : 'País/Región'
    @Common.ValueListMapping.CollectionPath : 'I_CountryVH'
    @Common.ValueListMapping.Parameters : [
      {
        $Type: 'SAP__common.ValueListParameterInOut',
        LocalDataProperty: CountryCode,
        ValueListProperty: 'Country'
      },
      {
        $Type: 'SAP__common.ValueListParameterDisplayOnly',
        ValueListProperty: 'Country_Text'
      },
      {
        $Type: 'SAP__common.ValueListParameterDisplayOnly',
        ValueListProperty: 'CountryThreeLetterISOCode'
      },
      {
        $Type: 'SAP__common.ValueListParameterDisplayOnly',
        ValueListProperty: 'CountryThreeDigitISOCode'
      }
    ]
    @Common.Text : CountryCodeText
    @Common.Text.@UI.TextArrangement : #TextOnly
    @Common.IsUpperCase : true
    @Common.Label : 'Clave de país/región'
    @Common.Heading : 'P/R'
    CountryCode : String(3) not null;
    @UI.Hidden : true
    @Common.Label : 'Denomin.país/región'
    @Common.QuickInfo : 'Denominación del país/de la región'
    CountryCodeText : String(50) not null;
  };
};

