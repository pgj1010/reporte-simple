sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iResetMockData({ ServiceUri: "/odata/v4/reporte/" });
            Given.iResetTestData();
            Given.iStartMyApp();
            Then.onTheConexionesListGenerated.iSeeThisPage();
        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheConexionesListGenerated.onFilterBar().iExecuteSearch();
            
            Then.onTheConexionesListGenerated.onTable().iCheckRows();

            When.onTheConexionesListGenerated.onTable().iPressRow(0);
            Then.onTheConexionesObjectPageGenerated.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});