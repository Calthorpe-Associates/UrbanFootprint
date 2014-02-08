/**
 * Created with PyCharm.
 * User: calthorpe
 * Date: 9/16/13
 * Time: 2:20 PM
 * To change this template use File | Settings | File Templates.
 */
Footprint.DonutChartsView = SC.View.design({
    classNames: ['donutCharts'],
    layout: { top: 0.30, bottom:.30, left: 0.3, right: 0},

    childViews: ['landUseChartAndTitleView', 'residentialChartAndTitleView', 'employmentChartAndTitleView'],

    landUseChartAndTitleView: SC.View.design({
        layout: { left: 0, top: 0, right: 0.66 },
        childViews: ['landUseTitleView', 'landUseChartView'],

        landUseTitleView: SC.LabelView.design({
            layout: { top: 5, bottom: 5, centerX: 0, width: 150, height: 20 },
            classNames: ['sectionTitle'],
            textAlign: SC.ALIGN_CENTER,
            tagName: "h1",
            value: "Landuse"

        }),

        landUseChartView: SC.View.design({
            classNames : ['landUseChart'],
            layout: { top: 10 },

            displayProperties: ['content'],
            content: null,
            contentBinding: SC.Binding.oneWay('Footprint.flatBuiltFormActiveController.content'),

            update: function(context) {
                if (this.getPath('content.status') & SC.Record.READY) {

                    this._landUseCategories = [];

                    var flatBuiltForm = this.get('content') ;

                    var dataManager = d3.edge.dataManager();
                    //dataManager contains the helper function "createDataObject"
                    //dataObjects represent the pieces of the pie chart, and contain "category" and "percentage" attributes


                    // for each of the landUse categories within the flat built form,
                    // gets percentage data from API
                    // creates data object with "category" and "percentage" attributes,
                    // adds to array of landUseCategories


                    this._landUseCategories.push(
                        dataManager.createDataObject("Residential", flatBuiltForm.get('percent_residential')),
                        dataManager.createDataObject("Mixed-Use", flatBuiltForm.get('percent_mixed_use')),
                        dataManager.createDataObject("Employment", flatBuiltForm.get('percent_employment')),
                        dataManager.createDataObject("Parks", flatBuiltForm.get('percent_parks')),
                        dataManager.createDataObject("Civic", flatBuiltForm.get('percent_civic')),
                        dataManager.createDataObject("Streets", flatBuiltForm.get('percent_streets'))
                    );

                    // d3.edge.donutChart is a function that takes a div bound with data as an argument
                    // we select the div that will hold the chart (using the context); bind the data (this._landUseCategories),
                    // and then call the donutChartMaker function
                    d3.selectAll(context).datum(this._landUseCategories)
                        .call(d3.edge.donutChart());
                }
            }
        })
    }),
    residentialChartAndTitleView: SC.View.design({
        layout: { left: 0.33, top: 0, right: 0.33 },
        childViews: ['residentialTitleView', 'residentialChartView'],

        residentialTitleView: SC.LabelView.design({
            layout: { centerX: 0, width: 150, height: 20 },
            classNames: ['sectionTitle'],
            textAlign: SC.ALIGN_CENTER,
            tagName: "h1",
            value: "Residential"
        }),

        residentialChartView: SC.View.design({
            classNames: ['residentialChart'],
            layout: { top: 10 },

            displayProperties: ['content'],
            content: null,
            contentBinding: SC.Binding.oneWay('Footprint.flatBuiltFormActiveController.content'),

            update: function(context) {
                if (this.getPath('content.status') & SC.Record.READY) {

                    this._residentialCategories = [];

                    var flatBuiltForm = this.get('content') ;

                    var dataManager = d3.edge.dataManager();
                    // RESIDENTIAL CHART

                    var multi_fam_density = parseFloat(flatBuiltForm.get('multifamily_5_plus_density')) + parseFloat(flatBuiltForm.get('multifamily_2_to_4_density')),
                        townhome_density = parseFloat(flatBuiltForm.get('multifamily_2_to_4_density')),
                        single_fam_small_density = parseFloat(flatBuiltForm.get('single_family_small_lot_density')),
                        single_fam_large_density = parseFloat(flatBuiltForm.get('single_family_large_lot_density'));

                    var total_res_density = multi_fam_density + townhome_density + single_fam_large_density + single_fam_small_density;

                    this._residentialCategories.push(
                        dataManager.createDataObject("Multifamily", multi_fam_density/total_res_density),
                        dataManager.createDataObject("Townhome", townhome_density/total_res_density),
                        dataManager.createDataObject("Single Family Small Lot", single_fam_small_density/total_res_density),
                        dataManager.createDataObject("Single Family Large Lot", single_fam_large_density/total_res_density)
                    );

                    // d3.edge.donutChart is a function that takes a div bound with data as an argument
                    // we select the div that will hold the chart (using the context); bind the data (this._landUseCategories),
                    // and then call the donutChartMaker function
                    d3.selectAll(context).datum(this._residentialCategories)
                        .call(d3.edge.donutChart());

                }
            }
        })
    }),
    employmentChartAndTitleView: SC.View.design({
        layout: { left: 0.66, top: 0 },
        childViews: ['employmentTitleView', 'employmentChartView'],

        employmentTitleView: SC.LabelView.design({
            layout: { centerX: 0, width: 150, height: 20 },
            classNames: ['sectionTitle'],
            textAlign: SC.ALIGN_CENTER,
            tagName: "h1",
            value: "Employment"
        }),

        employmentChartView: SC.View.design({
            classNames: ['employmentChart'],
            layout: { top: 10 },

            displayProperties: ['content'],
            content: null,
            contentBinding: SC.Binding.oneWay('Footprint.flatBuiltFormActiveController.content'),
            update: function(context) {

                if (this.getPath('content.status') & SC.Record.READY) {
                    this._employmentCategories = [];

                    var flatBuiltForm = this.get('content') ;
                    if (!flatBuiltForm)
                        return;

                    var dataManager = d3.edge.dataManager();

                    var retail_density = parseFloat(flatBuiltForm.get('retail_density')),
                        office_density = parseFloat(flatBuiltForm.get('office_density')),
                        industrial_density = parseFloat(flatBuiltForm.get('industrial_density'));

                    var total_density = retail_density + office_density + industrial_density;

                    this._employmentCategories.push(
                        dataManager.createDataObject("Retail", retail_density/total_density),
                        dataManager.createDataObject("Office", office_density/total_density),
                        dataManager.createDataObject("Industrial", industrial_density/total_density)
                    );

                    d3.selectAll(context).datum(this._employmentCategories)
                        .call(d3.edge.donutChart());

                }
            }
        })
    })
});
