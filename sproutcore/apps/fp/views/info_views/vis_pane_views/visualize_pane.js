
sc_require('resources/donutChartMaker');
sc_require('resources/builtFormVisUtils');
sc_require('views/info_views/vis_pane_views/examples_view');
sc_require('views/info_views/vis_pane_views/development_chars_view');
sc_require('views/info_views/vis_pane_views/donut_charts_view');
sc_require('views/info_views/vis_pane_views/bar_chart_view');
 /*
* UrbanFootprint-California (v1.0), Land Use Scenario Development and Modeling System.
* 
* Copyright (C) 2013 Calthorpe Associates
* 
* This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 3 of the License.
* 
* This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
* 
* Contact: Joe DiStefano (joed@calthorpe.com), Calthorpe Associates. Firm contact: 2095 Rose Street Suite 201, Berkeley CA 94709. Phone: (510) 548-6800. Web: www.calthorpe.com
*/

Footprint.VisualizePane = SC.PanelPane.extend(SC.ActionSupport, {

    layout: { height:630, width:1300, centerX: 0, centerY: 0 },

    contentView: SC.View.extend({
        classNames:['footprint-visualize-palette-pane'],
        childViews:'mainView listView'.w(),

        content:null,
        contentBinding: SC.Binding.oneWay('Footprint.builtFormActiveController.content'),

        flatBuiltFormContent: null,
        flatBuiltFormContentBinding:SC.Binding.oneWay('Footprint.flatBuiltFormActiveController.content'),

        mainView: SC.View.extend({

            layout: { left:.20 },

            classNames:['footprint-visualize-pane-content'],
            childViews:'headerView descriptionView examplesView barChartView donutChartsView rightOfBarChartView developmentCharsView footerView'.w(),

            content: null,
            contentBinding: SC.Binding.oneWay('.parentView.content'),

            flatBuiltFormContent: null,
            flatBuiltFormContentBinding:SC.Binding.oneWay('.parentView.flatBuiltFormContent'),

            color: null,
            colorBinding: SC.Binding.oneWay('*content.medium').transform(function(medium) {
             if (medium) {
                 return medium.getPath('content.fill.color');
             }
            }),

            headerView: SC.LabelView.extend({
                classNames: ['footprint-visualize-pane-header'],
                layout: { left: 0, right: 0, top: 0, height: 0.07 },
                displayProperties: ['content', 'color'],

                valueBinding: SC.Binding.oneWay('.parentView*content.name'),

                color: null,
                colorBinding: SC.Binding.oneWay('.parentView.color'),

                backgroundColor:null,
                backgroundColorBinding: SC.Binding.oneWay('.parentView.color'),
                classNameBindings: ['hasLightBackground'],

                hasLightBackground: function() {
                    if (this.get('color')) {
                        return isLightColor(this.get('color'));
                        }
                    }.property('color').cacheable(),

                render: function(context) {
                sc_super();
                }
            }),

            descriptionView: SC.View.design({
                layout: { top: 0.06, left: 0, right:.65, bottom: 0.70},
                classNames: ['descriptionBlock'],
                displayProperties: ['content'],

                content: null,
                contentBinding: SC.Binding.oneWay('.parentView.flatBuiltFormContent'),

                render: function(context) {
                 var description =this.getPath('content.description');
                 context = context.begin('div').push(description).end();

                 sc_super();
                }
            }),

            rightOfBarChartView: SC.View.design({
                layout: { top: 0.06, left: 0.95, bottom: 0.75},
                classNames: ['rightOfBarChart']
                // this is a hack to get the rounded edge below the header
            }),

            barChartView: Footprint.BarChartView.extend({
                contentBinding: SC.Binding.oneWay('.parentView.flatBuiltFormContent')
            }),

            donutChartsView: Footprint.DonutChartsView.extend({
                contentBinding: SC.Binding.oneWay('.parentView.flatBuiltFormContent')
            }),

            examplesView: Footprint.ExamplesView,

            developmentCharsView: Footprint.DevelopmentCharsView.extend({
                contentBinding: SC.Binding.oneWay('.parentView.flatBuiltFormContent')
            }),

            footerView: SC.View.extend({
                childViews: 'cancelButtonView'.w(),
                classNames: ['footprint-visualize-pane-footer'],
                layout: { left: 0, right: 0, top: 0.95 },
                displayProperties: ['content', 'color'],

                color: null,
                colorBinding: SC.Binding.oneWay('.parentView.color'),

                render: function(context) {
                 sc_super();
                 var color = this.get('color');
                 context.addStyle("background-color", color);
                },

                cancelButtonView: SC.ButtonView.design({
                 layout: {bottom: 5, right: 20, height:24, width:80},
                 title: 'Close',
                 action: 'doClose',
                 isCancel: YES
                })
            })
        }),

        listView: SC.ScrollView.extend({
            layout: { right:.80},
            media: null,
            // TODO this doesn't make sense
            loadMedia: function () {
             this.set('media', Footprint.store.find(SC.Query.local(
                 Footprint.Medium, {
                     orderBy: 'key' })));
            }.observes('Footprint.scenarioActiveController.content'),

            contentView: SC.SourceListView.extend({
                isEnabledBinding: SC.Binding.oneWay('.content').bool(),
                rowHeight: 20,
                actOnSelect: NO,
                contentIconKey: 'medium',
                contentValueKey: 'name',

                contentBinding: SC.Binding.oneWay('Footprint.builtFormCategoriesTreeController.arrangedObjects'),
                selectionBinding: SC.Binding.from('Footprint.builtFormCategoriesTreeController.selection'),

                exampleView: SC.View.extend(SC.Control, SC.ContentDisplay, {
                    classNames: ['footprint-built-form-item'],
                    contentDisplayProperties: ['name'],

                    render: function(context) {
                        // Color swab
                        var color = this.getPath('content.medium.content.fill.color');
                        context.begin()
                            .addClass(this.getPath('theme.classNames'))
                            .addClass(['sc-view', 'footprint-medium-color'])
                            .setStyle({ 'background-color': color })
                            .end();
                        // Label
                        context.begin()
                            .addClass(this.getPath('theme.classNames'))
                            .addClass(['sc-view', 'sc-label-view', 'footprint-built-form-item-label-view'])
                            .push(this.getPath('content.name'))
                            .end();
                    },
                    update: function ($context) {
                        $context.find('.footprint-medium-color').css('background-color', this.getPath('content.medium.content.fill.color'));
                        $context.find('.footprint-built-form-item-label-view').text(this.getPath('content.name'));
                    }
                })
            })
        })
    })
});

