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

sc_require('views/presentation/result/chart_legend_view');

Footprint.ChartView = SC.View.extend({

    classNames: 'chart-view'.w(),
    childViews: 'legendView graphView'.w(),
    resultLibraryKey: null,

    content:null,
    /***
     * The scenarios which form the basis of each sample
     */
    scenarios:null,

    /***
     * Returns a dict that maps result query column names to label names.
     * (e.g. sum__du: Dwelling Unit Sum)
     * @returns {*}
     * @private
     */
    columnToLabel: function() {
        return this.getPath('content.configuration.column_to_label');
    }.property('content').cacheable(),

    /***
     * Returns the keys representing the result query columns (a.k.a the aggregate column name)
     * @returns {*}
     * @private
     */
    keys: function() {
        var attributes = this.getPath('content.configuration.attributes');
        var attributeToColumn = this.getPath('content.configuration.attribute_to_column');
        return SC.none(attributeToColumn) ?
            null :
            attributes.map(function (attribute) { return attributeToColumn[attribute]})

    }.property('content').cacheable(),

    /***
     * The content of this View is a Result. This property returns that Result for every Scenario of scenarios
     * The results include one matching content
     */
    results: function() {
        if (!this.get('scenarios'))
            return;
        return this.get('scenarios').map(function(scenario, i) {

            // Match the ResultPage with the resultLibraryActiveController key.
            var resultPage = scenario.getPath('presentations.results').filter(function(resultPage) {
                return this.get('resultLibraryKey') == resultPage.get('key');
            }, this)[0];

            // Find the Result of the Scenario matching the key of the content Result
            return resultPage ? resultPage.get('presentation_media').filter(function(result) {
                return result.getPath('db_entity_key') == this.getPath('content.db_entity_key');
            }, this)[0] || null : null;
        }, this).compact();
    }.property('scenarios', 'scenarios.[]').cacheable(),

    /***
     * The names of the samples used to label the groups or stacked samples
     */
    sampleNames: function() {

        if (!this.get('scenarios'))
            return [];
        // TODO don't use the same code here as results
        var scenarios = this.get('scenarios').filter(function(scenario, i) {
            // Match the ResultPage with the resultLibraryActiveController key.
            var resultPage = scenario.getPath('presentations.results').filter(function(resultPage) {
                return this.get('resultLibraryKey') == resultPage.get('key');
            }, this)[0];

            // Find the Result of the Scenario matching the key of the content Result
            return resultPage ? resultPage.get('presentation_media').filter(function(result) {
                return result.getPath('db_entity_key') == this.getPath('content.db_entity_key');
            }, this)[0] || null : null;
        }, this).compact();

        return scenarios.mapProperty('name');
    }.property('scenarios', 'scenarios.[]').cacheable(),

    /***
     * Create the data structure for the charts. This needs to be recreated when query results change
     * TODO Eventually we should do transitions when the query data changes. We do this by uniquely identifying
     * each datum so that d3 knows that it is changing rather than being replaced
     * @returns {*|Array|Array} The outer array is each series (e.g. du__sum, pop__sum)
     * Within each series is the datum for each sample (Scenario) of the series,
     * which is the d3 plot datum containing:
     * Of these all are required except perhaps the value key, which we might remove.
     * [
     *  [(scenarioA/seriesA, scenarioB/seriesA, scenarioC/seriesA, ...)],
     *  [(scenarioA/seriesB, scenarioB/seriesB, scenarioC/seriesB)],
     *  ...
     * ]
     * where each (../..) is a datum:
     * {id: series index, value:scenario/series value, key:series name, x:xpos,y:value}
     * @private
     */
    data: function() {
        var keys = this.get('keys');
        if (!keys)
            return null;
        // Build the matrix by iterating over scenario Result then iterating over the series of query aggregates. Then Transpose the matrix so that are outer arrays are each series and within each array are each sample of that series.
        var raw_data = d3.transpose(this.get('results').map(function(resultRecord, i) {

            // simplify the column names and create a lookup dict to the datum
            // {du__sum:5, emp__sum:6} => {du:5, emp:6}
            var result_lookup = $.mapObjectToObject(resultRecord.get('query'),
                function(key, value) {
                    // Remove the aggregate part of the column name (e.g. '__sum')
                    // Zero out null values so d3 can process
                    return  [key.substr(0, key.indexOf('__',0)), parseFloat(value || 0)];
                });

            // Create the d3 series of data for the Result. Give each datum a unique id
            // by index in the series. I'm not sure if this can't just be i
            var data = keys.map(function(key, i) {
                return { id: i, key: key, label: this.get('columnToLabel')[key], value: result_lookup[key] };
            }, this);

            var sum = d3.sum(data, function(d) {return d.value });

            data = data.map(function (datum) {datum.percent = datum.value/sum; return datum; });

            // Add an x and y to each datum. x is based on a spacing function and y is simply the datum value
            return data.map(function(datum) {
                return this._convertToPlotData(datum, i, i*10+i);
            }, this);

        }, this));
        return d3.layout.stack()(raw_data);
    }.property('results').cacheable(),


    /***
     * Given a sample/series specific datum, this adds an x and a y to the object.
     * The x is determined by the given parameter and determines spacing. The y is the datum value
     * which determines the bar height
     * @param datum
     * @param index
     * @param x: TODO we might be able to default this to something sensible
     * @returns {*}
     * @private
     */
    _convertToPlotData: function (datum, index, x){
        return $.extend({x:x, y:datum.value}, datum);
    },

    /***
     * Creates the color scale based on the Medium content colorRange,
     * which is simply an array of two or more colors
     */
    colorScale: function() {
        return d3.scale.linear()
            // The domain is 0 to number of samples
            .domain([0, this.get('data').length - 1])
            // Map the domain to the inclusive range of values between the colors
            .range(this.getPath('content.medium.content.colorRange'));
    }.property('mediumContent').cacheable(),

    legendView: Footprint.ChartLegendView.extend({
        keysBinding: SC.Binding.oneWay('.parentView.keys'),
        columnToLabelBinding: SC.Binding.oneWay('.parentView.columnToLabel')
    }),

    /***
    * The view containing the chart. The chart is created by using d3 to draw an SVG element
    * in the view's div
    */
    graphView: SC.View.extend({

        displayProperties: ['content', 'isStacked'],

        // Leave some height for the title, radio buttons, and legend
        layout: { left:0, top:0.2, bottom: 0.2},

        /***
         * Indicates whether or not the chart has been created
         */
        initialized:NO,

        // This is our template Result. We use it to find the same keyed Result in all the Scenarios
        // in scenarios
        content:null,
        contentBinding:SC.Binding.oneWay('.parentView.content'),

        /***
         * A reference to all scenarios of the parent Project to enable side-by-side comparison
         */
        scenarios:null,
        scenariosBinding:SC.Binding.oneWay(parentViewPath(1, '.scenarios')),

        sampleNames:null,
        sampleNamesBinding:SC.Binding.oneWay(parentViewPath(1,'.sampleNames')),

        /**
         * The number of samples
         */
        sampleCount: function() {
            return this.get('scenarios').length();
        }.property('scenarios').cacheable(),

        seriesCount: function() {
            // We map here just to count the key/values
            return $.map(this.getPath('content.query'), function(v,k) {return k}).length;
        }.property('content').cacheable(),

        /***
         * The result.medium.content, whose colors can be updated by the user to change the chart colors
         * If the Result is saved back to the server the color choices will be preserved
         * Note that only the content Result color is used. The stored color of the Result of the
         * other Scenarios are ignored
         */
        mediumContent: null,
        mediumContentBinding:SC.Binding.oneWay('.content.medium.content'),

        /***
         * Mirror the parent isStacked
         */
        isStacked: null,
        isStackedBinding: SC.Binding.oneWay('.parentView.isStacked'),

        /***
         * Calculates the max y for the grouped version of the chart by iterating over every datum's y
         * Calculates the max y for the stacked version of the chart by iterating over each sample
         * and aggregating the series' ys for each to find the greatest stacked height.
         */


        yMax: function() {
            self = this;
            return d3.max(self.getPath('parentView.data'), function(sample) {
                return d3.max(sample, function(d) {
                    return self.get('isStacked') ? d.y0 + d.y : d.y;
                });
            });
        }.property('data', 'isStacked').cacheable(),
        yMin: function() {
            self = this;
            return d3.min(self.getPath('parentView.data'), function(sample) {
                return d3.min(sample, function(d) {
                    return self.get('isStacked') ? d.y0 + d.y : d.y;
                });
            });
        }.property('data', 'isStacked').cacheable(),

        /**
         * Sets the scale based on yMax
         */
        yScale: function() {
            self = this;
            return d3.scale.linear()
                // This range should extend from either 0 or the minimum y value (if negative)
                // to the maximum y value
                .domain([d3.min([this.get('yMin'), 0]), d3.max([0, this.get('yMax')])])
                .range([this.get('height'), 10]);
        }.property('yMax', 'height'),

        /**
         * Sets the scale based on the sampleCount and width
         */
        xScale: function() {
            return d3.scale.ordinal()
                .domain(d3.range(this.get('sampleCount')))
                 // Sets bands for labels and ratio of groups to space between
                .rangeRoundBands([0, this.get('width')],.08);
        }.property('sampleCount', 'width'),

        /***
         *
         * Margin for the axes to fit within. The graph g element is translated
         * and scaled according to these
         */
        margin: { left:0.1, top:0.08, bottom:0.2},

        /***
         * The calculated graph width, which subtracts the margins
         * The SVG will still use the full width
         */
        width: function() {
            return this.getPath('frame.width') - this.get('leftMarginWidth');
        }.property('leftMarginWidth').cacheable(),
        leftMarginWidth:function() {
            return this.getPath('frame.width') * this.get('margin').left;
        }.property('frame').cacheable(),

        /***
         * The calculated chart height, which subtracts the margins
         * The SVG will still use the full height
         */
        height:function() {
            return this.getPath('frame.height') - this.get('bottomMarginHeight') - this.get('topMarginHeight');
        }.property('bottomMarginHeight').cacheable(),
        /***
         * The calculated height of the bottom margin
         */
        bottomMarginHeight:function() {
            return this.getPath('frame.height') * this.get('margin').bottom;
        }.property('frame').cacheable(),

        topMarginHeight:function() {
            return this.getPath('frame.height') * this.get('margin').top;
        }.property().cacheable(),

        /***
         * All of the series elements directly under the graph element.
         */
        seriesSet:null,

        /***
         * Stores the scaler that determines the x positioning of the bars based on whether they are stacked or not
         */
        seriesSpacer:null,
        /***
         * Stores the d3 select set of all bars in the bar graph
        */
        barSet:null,

        didCreateLayer:function() {
            this.notifyPropertyChange('data');
        },

        data: null,
        dataBinding: SC.Binding.oneWay('.parentView.data'),
        displayProperties:['data', 'isStacked'],

        update: function (context) {

            if (this.didChangeFor(context, this.get('displayProperties'))) {
                return;
            }
            var data = this.get('data');
            if (data.length == 0)
                return;

/*            if (!this.get('seriesSet')) {
                console.log("I'd rather be bootstrapping");
            } else {
                console.log("I'm simply updating");
            }*/

            var width = this.get('width');
            var height = this.get('height');

            // Draw the svg and main g element to hold the graph
            var svg = d3.selectAll(context)
                .selectAll("svg")
                .data([data]);

            // Anything done to container only happens the first time it is rendered (after that, enter() will
            // be empty. Anything you want to do to existing content must be done to svg
            var container = svg.enter().append("svg")
                    .attr("width", this.getPath('frame.width'))
                    .attr("height", this.getPath('frame.width'))
                .append("g");

                svg.attr("transform", "translate(" + this.get('leftMarginWidth') + "," + this.get('topMarginHeight') + ")");

            // Assigns color to layers
            var colorScale = this.getPath('parentView.colorScale');

            var samplesCount = this.get('sampleCount');
            var seriesCount = this.get('seriesCount');

            // This is the spacing of each group, the domain/range is 0 to the number of samples
            // The spacing is the chart width divided by the number of samples, plus .2 for buffer.
            var samplesSpacer = d3.scale.ordinal()
                .domain(d3.range(this.get('sampleNames').length))
                .rangeRoundBands([0, width], 0.1, 0.1);


            // This is the spacing within each sample group, the domain/range is 0 to the number of series
            // The spacing is the width of each sample divided by number of series. No buffer between them.
            var seriesSpacer = d3.scale.ordinal()
                .domain(d3.range(seriesCount))
                .rangeRoundBands([0, samplesSpacer.rangeBand()], 0, 0);

            this.set('seriesSpacer', seriesSpacer);


            // The data with a stack wrapper for optional stacking
//            var data = d3.layout.stack()(raw_data);

            var isStacked = this.get('isStacked');

            var seriesSet = svg.selectAll(".series")
                // Bind the 2D matrix. Each outer array is a series. Each series has a datum per Sample
                .data(data)
            seriesSet.enter().append("g")
                .attr("class", "series")
            seriesSet.style("fill", function (d, i) { return colorScale(i); });

            this.set('seriesSet', seriesSet);

            var xScale = this.get('xScale');
            var yScale = this.get('yScale');

            // The svg div so we can get the right mouse coordinates for the tooltip


            var commafy = d3.format(",.0f");
            // Draws bars of each group
            var rects = seriesSet.selectAll("rect")
                .data(function(d) { return d; })
            rects.enter().append("rect")
                .attr("transform", function(d, i) { return "translate(" + samplesSpacer(i) + ", 0)"; })
                .attr("y", function(d) { return yScale(0); })
            rects.attr("width", Math.min(seriesSpacer.rangeBand(), width/5));

            var rect = this.set('barSet', rects);

            var isStackable = this.getPath('content.configuration.stackable');

            var barTooltip = seriesSet.selectAll("rect")
                .append('svg:title')
                .data(function(d) {return d;})
                .text(function(d) {

                    var tooltip_text = commafy(d3.round(d.y));

                    if (isStackable) {
                        //include the percent in the tooltip if the bars are part of a whole (i.e. "dwelling units
                        // by type," as opposed to "All Metrics" for which pct doesn't make sense

                        perct= d.percent*100;
                        if (perct != 0) {
                            formattedPerct = perct.toFixed(0) + "%";
                        }else {formattedPerct = ""}

                       tooltip_text = d.label + ": " + tooltip_text + " (" + formattedPerct + ")" ;
                    }
                    return tooltip_text; });

            // Places values on bars
            seriesSet.selectAll("text")
                .data(function(d) { return d; })
              .enter().append("text")
                .attr("class", "text")
                .attr("transform", function(d, i) { return "translate(" + samplesSpacer(i) + ", 0)"; })
                .attr("x", Math.min(seriesSpacer.rangeBand(), width/5)/2)
                .attr("y", function(d, i) {
                    return isStacked?
                        // If stacked, shift the text label so that it's in the center of the bar (y - height)
                        yScale(d.y + d.y0) + Math.abs(yScale(d.y0) - yScale(d.y0 + d.y))/2 + 7:
                        // If grouped, position it right above the bar;\
                        yScale(d.y); })
                .attr("dy", function(d) { return (d.y >= 0) ? "-0.3em" : "1.1em"; })
                .attr("text-anchor", "middle")
                .text(function(d) {
                    return (d.value > 0) ?
                        commafy(d3.round(d.value)) :
                        "";
                    });

            // adding control total guide
            // TODO this was creating spurious svg elements, so I shut it off --erictheise
            /* this.createControlMarkers(); */

            // draw x- and y- axes, and horizontal zero line for reference against negatives
            container.append("g")
                .attr("class", "axis x-axis")
                .attr("transform", "translate(0," + height + ")")
                .call(this.get('xAxis'));

//            if (!isStacked) {
//                container.append("g")
//                    .attr("class", "axis y-axis")
//                    .call(this.get('yAxis'));
//            }

            container.append("line")
                .attr("class", "zero-line")
                .attr("x1", 0)
                .attr("x2", 300)
                .attr("y1", yScale(0))
                .attr("y2", yScale(0));

            this.openingTransition();

        },

        /***
         * The initial growing of the bars from zero when the chart is created
         */
        openingTransition: function() {
            // The scale based on the maximum bar height
            var yScale = this.get('yScale');
            // If the graph starts stacked we have to set different values
            var isStacked = this.get('isStacked');
            var height = this.get('height');
            var seriesSpacer = this.get('seriesSpacer');

            // Transition each bar horizontally
            this.get('barSet').transition()
                .duration(600)
                 // Staggers drawing based on series index
                .delay(function(d, i) {
                    return isStacked ?
                        // Set the height to take into account y0
                        0 :
                        // Set the target y to the scaled datum value
                        (600) ;
                })
                .attr("y", function(d) {
                    console.log('openingTransition: ', isStacked);
                    return yScale(
                        isStacked ?
                            // Set the target y to y0 plus the datum value
                            d3.max([0, d.y0 + d.y]) :
                            // Set to the scaled version of y
                            d3.max([0, d.y]) );
                })
                // Set the target height
                .attr("height", function(d) {
                    return isStacked ?
                        // Set the height to take into account y0
                        Math.abs(yScale(d.y0) - yScale(d.y0 + d.y)) :
                        // Set the target y to the scaled datum value
                        Math.abs(yScale(d.y) - yScale(0));
                });

            // If it is going from unstacked to stacked, transition the x values after the y
            this.get('seriesSet').transition()
                .duration(600)
                .delay(function(d, i) {
                    return isStacked ?
                        // Set the height to take into account y0
                        (600) :
                        // Set the target y to the scaled datum value
                        (0);
                })
                // Staggers drawing based on series index
                .attr("transform", function(d, i) {
                    return isStacked?
                        "translate(0, 0)" :
                        "translate(" + seriesSpacer(i) + ", 0)"; });

            this.get('seriesSet').selectAll('text')
                .transition()
                .duration(600)
                .delay(function(d, i) {
                    return isStacked ?
                        // Set the height to take into account y0
                        0 :
                        // Set the target y to the scaled datum value
                        (600) ;
                })
                .attr("y", function(d, i) {
                return isStacked?
                    // If stacked, shift the text label so that it's in the center of the bar (y - height)
                    yScale(d.y + d.y0) + Math.abs(yScale(d.y0) - yScale(d.y0 + d.y))/2 + 7:
                    // If grouped, position it right above the bar;\
                    yScale(d.y); })
        },

        /***
         * Create the X axis using the sample names
         */
        xAxis: function() {
            var xlabels = d3.scale.ordinal()
                .domain(this.get('sampleNames'))
                .rangeRoundBands([0, this.get('width')], .08);

            return d3.svg.axis()
                .scale(xlabels)
                .orient("bottom")
                .ticks(0)
                .tickSize(0, 0, 0)
                .tickPadding(10);
        }.property('sampleName', 'width'),

        /***
         * Create the Y axis based on the yScale
         * @returns {*}
         */
        yAxis: function() {
            return d3.svg.axis()
                .scale(this.get('yScale'))
                .orient("left")
                .ticks(4)
                .tickSubdivide(true)
                .tickSize(4, 2, 0)
                .tickPadding(1)
                .tickFormat(d3.format("s"))
        }.property('yScale'),

//        createControlMarkers: function() {
//            var self = this;
//            var xScale = this.get('xScale');
//            var yScale = this.get('yScale');
//
//            function getControlTotals(i) {
//                return self.getPath('parentView.results').objectAt(i).getPath('configuration.control_totals');
//            }
//            return this.get('seriesSet').selectAll("line")
//                .data(function(d) {return d;})
//                .enter()
//                .append("line")
//                .attr("x1", function(d) { return xScale(d.x); })
//                .attr("x2", function(d) { return xScale(d.x) + xScale.rangeBand(); })
//                .attr("y1", function(d, i) {
//                    return yScale(d3.values(getControlTotals(i))[0]); // TODO just using first control total
//                })
//                .attr("y2", function(d, i) {
//                    return yScale(d3.values(getControlTotals(i))[0]); // TODO just using first control total
//                })
//                .style("stroke","black")
//                .style("stroke-width", "3");
//
//        },

        change: function () {
            clearTimeout(timeout);
            if (this.value === "grouped") transitionGrouped();
            else transitionStacked();
        },

        transitionGrouped: function () {
            y.domain([0, yGroupMax]);

            rect.transition()
                .duration(500)
                .delay(function (d, i) {
                    return i * 10;
                })
                .attr("x", function (d, i, j) {
                    return x(d.x) + x.rangeBand() / n * j;
                })
                .attr("width", x.rangeBand() / n)
                .transition()
                .attr("y", function (d) {
                    return y(d.y);
                })
                .attr("height", function (d) {
                    return height - y(d.y);
                });
        },

        transitionStacked: function () {
            y.domain([0, yStackMax]);

            rect.transition()
                .duration(500)
                .delay(function (d, i) {
                    return i * 10;
                })
                .attr("y", function (d) {
                    return y(d.y0 + d.y);
                })
                .attr("height", function (d) {
                    return y(d.y0) - y(d.y0 + d.y);
                })
                .transition()
                .attr("x", function (d) {
                    return x(d.x);
                })
                .attr("width", seriesSpacer.rangeBand());
        },

        /**
         * Override render to only render on the firstTime
         * @param context
         * @param firstTime
         */
        render: function (context,firstTime) {
            if (firstTime) {
                sc_super();
            }
        },

        toString: function() {
            return "%@:\n%@".fmt(sc_super(), this.toStringAttributes('isStacked sampleNames sampleCount seriesCount mediumContent yMax yScale xScale width height container seriesSet barSet'.w()));
        }
    })
});
