sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"conexiones/test/integration/pages/ConexionesList.gen",
	"conexiones/test/integration/pages/ConexionesObjectPage.gen",
	"conexiones/test/integration/pages/VuelosObjectPage.gen"
], function (JourneyRunner, ConexionesListGenerated, ConexionesObjectPageGenerated, VuelosObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('conexiones') + '/test/flp.html#app-preview',
        pages: {
			onTheConexionesListGenerated: ConexionesListGenerated,
			onTheConexionesObjectPageGenerated: ConexionesObjectPageGenerated,
			onTheVuelosObjectPageGenerated: VuelosObjectPageGenerated
        },
        async: true
    });

    return runner;
});

