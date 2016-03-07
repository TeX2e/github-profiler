'use strict';

class LangsStatGraph {
    // Use d3.js as JavaScript library for manipulating documents based on data.
    // Further information is available at
    // https://github.com/mbostock/d3/wiki

    constructor(width, height) {
        this.width  = width  || 800;
        this.height = height || 500;
        this.maxRadius = Math.min(width, height) / 2;
        this.centerCircleSize = 60;

        this.svg = d3.select('.langs-stat')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        this.g = this.svg.append('g')
            .attr('transform', `translate(${width  / 2 - 100}, ${height / 2})`);

        this.allPath;

        this.labels = this.svg.append('g')
            .attr('class', 'labels')
            .attr('transform', `translate(${width - 200}, ${50})`);

        // --- used functions ---

        this.theta = d3.scale.linear()
            .range([0, 2 * Math.PI]);
        this.radius = d3.scale.linear()
            .range([0, this.maxRadius]);

        this.arc = d3.svg.arc()
            .startAngle((d) => {
                return Math.max(0, Math.min(2 * Math.PI, this.theta(d.x)));
            })
            .endAngle((d) => {
                return Math.max(0, Math.min(2 * Math.PI, this.theta(d.x + d.dx)));
            })
            .innerRadius((d) => {
                return Math.max(0, this.radius(d.y)) + 0.3;
            })
            .outerRadius((d) => {
                return Math.max(0, this.radius(d.y + d.dy)) - 0.3;
            });
    }

    // draw partition graph
    draw() {
        // $.getJSON('stat.json', this.drawer.bind(this));
        $.getJSON('stat.json', this.drawer.bind(this));
    }

    drawer(stats) {
        // Use d3.layout.partition
        // Further information is available at
        // https://github.com/mbostock/d3/wiki/Partition-Layout#partition

        var hierarchy = {
            name: 'All Languages',
            children: [],
        };

        _(stats).each(function(stat, lang) {
            hierarchy.children.push({
                name: lang,
                children: stat
            });
        });

        var partition = d3.layout.partition()
            .children(function (d) {
                return Array.isArray(d.children) ? d.children : null;
            })
            .value((d) => d.loc);

        var color = function(d) {
            var colors;
            if (!d.parent) {
                colors = d3.scale.category10();
                d.color = '#fff';
            }

            if (d.parent && d.children) {
                var startColor = d3.hcl(d.color)
                    .darker();
                var endColor = d3.hcl(d.color)
                    .brighter();
                colors = d3.scale.linear()
                    .interpolate(d3.interpolateHcl)
                    .range([startColor.toString(), endColor.toString()])
                    .domain([0, d.children.length+1]);
            }

            if (d.children) {
                d.children.map(function (child, i) {
                    return { value: child.loc, idx: i };
                }).sort(function (a, b) {
                    return b.loc - a.loc;
                }).forEach(function (child, i) {
                    d.children[child.idx].color = colors(i);
                });
            }

            return d.color;
        };

        this.allPath = this.g.selectAll('path')
            .data(partition.nodes(hierarchy))
          .enter().append('path')
            .attr('d', this.arc)
            .attr('fill', color);

        this.updateLabels(hierarchy);

        // --- set on-click event handler ---

        var center = this.g.append('text')
            .attr('class', 'stat-center')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .text('All Languages');

        this.allPath
            .on('mouseover', function (d) {
                d3.select(this).style('opacity', '0.8');
            })
            .on('mouseout', function (d) {
                d3.select(this).style('opacity', '1');
            })
            .on('click', this.clickHandler.bind(this))
    }

    // click handler
    clickHandler(d) {
        this.zoomInOut(d);
        this.updateCenterLabel(d);
        this.updateLabels(d);
    }

    // invoked when an arc is clicked.
    // zoom in or out to clicked partition
    zoomInOut(datum) {
        if (!datum.children) return;

        this.allPath.transition()
            .duration(750)
            .attrTween('d', this.arcTween(datum).bind(this));
    }

    // return a function that interpolates graph between zoom in and out.
    arcTween(datum) {
        var thetaDomain  = d3.interpolate(this.theta.domain(),
            [datum.x, datum.x + datum.dx]);
        var radiusDomain = d3.interpolate(this.radius.domain(),
            [datum.y, 1]);
        var radiusRange  = d3.interpolate(this.radius.range(),
            [datum.y ? this.centerCircleSize : 0, this.maxRadius]);

        // return a function calculateNewPath(d, i)
        return (d, i) => {
            if (i != 0) {
                // return a function interpolatePathForRoot(time)
                return (time) => {
                    return this.arc(d);
                };
            } else {
                // return function interpolatePathForNonRoot(time)
                return (time) => {
                    this.theta.domain(thetaDomain(time));
                    this.radius.domain(radiusDomain(time)).range(radiusRange(time));
                    return this.arc(d);
                };
            }
        };
    }

    // update the label of center of graph
    updateCenterLabel(datum) {
        var center = this.g.select('.stat-center')
            .text(datum.name);
    }

    // update the labels on right side
    updateLabels(d) {
        var dataset = d.children;

        var labels = d3.select('svg g.labels');

        labels.selectAll('rect').remove();
        labels.selectAll('text').remove();

        labels.selectAll('rect')
            .data(dataset)
          .enter().append('rect')
            .attr('x', -20)
            .attr('y', function (d, i) {
                return i * 30 - 15;
            })
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', function (d) {
                return d.color;
            });

        labels.selectAll('text')
            .data(dataset)
          .enter()
            .append('a')
            .attr('xlink:href', function (d) {
                return d.url || '#';
            })
            .append('text')
            .attr('y', function (d, i) {
                return i * 30;
            })
            .text(function (d) {
                var name = d.name.replace(/^.*\//, '');
                return name;
            });

        // zoom in or out when a language label is clicked
        labels.selectAll('text')
            .on('click', (d) => {
                this.clickHandler(d);
            });
    }

}

$(document).ready(function () {
    if ($('.langs-stat').length) {
        var graph = new LangsStatGraph(800, 500);
        graph.draw();
    }
});


// function drawPartitionGraph() {
//     // Use d3.js as JavaScript library for manipulating documents based on data.
//     // Further information is available at
//     // https://github.com/mbostock/d3/wiki
//
//     var width = 800;
//     var height = 500;
//     var maxRadius = Math.min(width, height) / 2;
//     var centerCircleSize = 60;
//
//     var svg = d3.select('.langs-stat')
//         .append('svg')
//         .attr('width', width)
//         .attr('height', height);
//
//     var g = svg.append('g')
//         .attr('transform', 'translate(' +
//             (width  / 2 - 100) + ',' +
//             (height / 2)       + ')' );
//
//     var labels = svg.append('g')
//         .attr('class', 'labels')
//         .attr('transform', 'translate(' +
//             (width - 200) + ',' +
//             (50)          + ')' );
//
//     // --- used functions ---
//
//     var theta = d3.scale.linear()
//         .range([0, 2 * Math.PI]);
//     var radius = d3.scale.linear()
//         .range([0, maxRadius]);
//
//     var arc = d3.svg.arc()
//         .startAngle(function (d) {
//             return Math.max(0, Math.min(2 * Math.PI, theta(d.x)));
//         })
//         .endAngle(function (d) {
//             return Math.max(0, Math.min(2 * Math.PI, theta(d.x + d.dx)));
//         })
//         .innerRadius(function (d) {
//             return Math.max(0, radius(d.y)) + 0.3;
//         })
//         .outerRadius(function (d) {
//             return Math.max(0, radius(d.y + d.dy)) - 0.3;
//         })
//
//     // --- draw partition graph ---
//     var deferredRequireJSON = $.getJSON('stat.json', $.noop);
//     deferredRequireJSON.done(function (stats) {
//         // Use d3.layout.partition
//         // Further information is available at
//         // https://github.com/mbostock/d3/wiki/Partition-Layout#partition
//
//         var hierarchy = {
//             name: 'All Languages',
//             children: [],
//         };
//
//         _(stats).each(function(stat, lang) {
//             hierarchy.children.push({
//                 name: lang,
//                 children: stat
//             });
//         });
//
//         var partition = d3.layout.partition()
//             .children(function (d) {
//                 return Array.isArray(d.children) ? d.children : null;
//             })
//             .value(function(d) { return d.loc; });
//
//         var color = function(d) {
//             var colors;
//             if (!d.parent) {
//                 colors = d3.scale.category10();
//                 d.color = '#fff';
//             }
//
//             if (d.parent && d.children) {
//                 var startColor = d3.hcl(d.color)
//                     .darker();
//                 var endColor = d3.hcl(d.color)
//                     .brighter();
//                 colors = d3.scale.linear()
//                     .interpolate(d3.interpolateHcl)
//                     .range([startColor.toString(), endColor.toString()])
//                     .domain([0, d.children.length+1]);
//             }
//
//             if (d.children) {
//                 d.children.map(function (child, i) {
//                     return { value: child.loc, idx: i };
//                 }).sort(function (a, b) {
//                     return b.loc - a.loc;
//                 }).forEach(function (child, i) {
//                     d.children[child.idx].color = colors(i);
//                 });
//             }
//
//             return d.color;
//         };
//
//         var allPath = g.selectAll('path')
//             .data(partition.nodes(hierarchy))
//           .enter().append('path')
//             .attr('d', arc)
//             .attr('fill', color);
//
//         updateLabels(hierarchy);
//
//         // --- set on-click event handler ---
//
//         var center = g.append('text')
//             .attr('class', 'stat-center')
//             .style('text-anchor', 'middle')
//             .style('pointer-events', 'none')
//             .text('All Languages');
//
//         allPath.on('mouseover', function (d) {
//                 d3.select(this).style('opacity', '0.8');
//             })
//             .on('mouseout', function (d) {
//                 d3.select(this).style('opacity', '1');
//             })
//             .on('click', function (datum) {
//                 if (!datum.children) return;
//
//                 allPath.transition()
//                     .duration(750)
//                     .attrTween('d', arcTween(datum));
//
//                 // set labels
//                 var center = g.select('.stat-center')
//                     .text(datum.name);
//
//                 updateLabels(datum);
//             });
//
//         function arcTween(datum) {
//             var thetaDomain  = d3.interpolate(theta.domain(),
//                 [datum.x, datum.x + datum.dx]);
//             var radiusDomain = d3.interpolate(radius.domain(),
//                 [datum.y, 1]);
//             var radiusRange  = d3.interpolate(radius.range(),
//                 [datum.y ? centerCircleSize : 0, maxRadius]);
//
//             return function calculateNewPath(d, i) {
//                 if (i != 0) {
//                     return function interpolatePathForRoot(time) {
//                         return arc(d);
//                     };
//                 } else {
//                     return function interpolatePathForNonRoot(time) {
//                         theta.domain(thetaDomain(time));
//                         radius.domain(radiusDomain(time)).range(radiusRange(time));
//                         return arc(d);
//                     };
//                 }
//             };
//         }
//
//         // update labels
//         function updateLabels(d) {
//             var dataset = d.children;
//
//             d3.select('svg g.labels').selectAll('rect').remove();
//             d3.select('svg g.labels').selectAll('text').remove();
//
//             d3.select('svg g.labels').selectAll('rect')
//                 .data(dataset)
//               .enter().append('rect')
//                 .attr('x', -20)
//                 .attr('y', function (d, i) {
//                     return i * 30 - 15;
//                 })
//                 .attr('width', 15)
//                 .attr('height', 15)
//                 .attr('fill', function (d) {
//                     return d.color;
//                 });
//
//             d3.select('svg g.labels').selectAll('text')
//                 .data(dataset)
//               .enter()
//                 .append('a')
//                 .attr('xlink:href', function (d) {
//                     return d.url;
//                 })
//                 .append('text')
//                 .attr('y', function (d, i) {
//                     return i * 30;
//                 })
//                 .text(function (d) {
//                     var name = d.name.replace(/^.*\//, '');
//                     return name;
//                 });
//         }
//     });
// };


// -----------------------------------------------------------------------------

// // class LangsStatGraph
//
// var bind = function (fn, me) {
//     return function () {
//         return fn.apply(me, arguments);
//     };
// };
//
// var LangsStatGraph = (function () {
//
//     // --- private fields ---
//
//     var width = 800;
//     var height = 500;
//     var maxRadius = Math.min(width, height) / 2;
//     var centerCircleSize = 60;
//
//     // --- private methods ---
//
//     var theta = d3.scale.linear()
//         .range([0, 2 * Math.PI]);
//     var radius = d3.scale.linear()
//         .range([0, maxRadius]);
//
//     var arc = d3.svg.arc()
//         .startAngle(function (d) {
//             return Math.max(0, Math.min(2 * Math.PI, theta(d.x)));
//         })
//         .endAngle(function (d) {
//             return Math.max(0, Math.min(2 * Math.PI, theta(d.x + d.dx)));
//         })
//         .innerRadius(function (d) {
//             return Math.max(0, radius(d.y)) + 0.3;
//         })
//         .outerRadius(function (d) {
//             return Math.max(0, radius(d.y + d.dy)) - 0.3;
//         });
//
//     // constructor
//
//     function LangsStatGraph(_width, _height) {
//         width  = _width;
//         height = _height;
//
//         this.svg = d3.select('.langs-stat')
//             .append('svg')
//             .attr('width', width)
//             .attr('height', height);
//
//         this.g = this.svg.append('g')
//             .attr('transform', 'translate(' +
//                 (width  / 2 - 100) + ',' +
//                 (height / 2)       + ')' );
//
//         this.labels = this.svg.append('g')
//             .attr('class', 'labels')
//             .attr('transform', 'translate(' +
//                 (width - 200) + ',' +
//                 (50)          + ')' );
//     }
//
//     // draw partition graph
//     LangsStatGraph.prototype.draw = function () {
//         var deferredRequireJSON = $.getJSON('stat.json', $.noop);
//         deferredRequireJSON.done(function (_this, stats) {
//             // Use d3.layout.partition
//             // Further information is available at
//             // https://github.com/mbostock/d3/wiki/Partition-Layout#partition
//
//             var hierarchy = {
//                 name: 'All Languages',
//                 children: [],
//             };
//
//             _(stats).each(function(stat, lang) {
//                 hierarchy.children.push({
//                     name: lang,
//                     children: stat
//                 });
//             });
//
//             var partition = d3.layout.partition()
//                 .children(function (d) {
//                     return Array.isArray(d.children) ? d.children : null;
//                 })
//                 .value(function(d) { return d.loc; });
//
//             var color = function(d) {
//                 var colors;
//                 if (!d.parent) {
//                     colors = d3.scale.category10();
//                     d.color = '#fff';
//                 }
//
//                 if (d.parent && d.children) {
//                     var startColor = d3.hcl(d.color)
//                         .darker();
//                     var endColor = d3.hcl(d.color)
//                         .brighter();
//                     colors = d3.scale.linear()
//                         .interpolate(d3.interpolateHcl)
//                         .range([startColor.toString(), endColor.toString()])
//                         .domain([0, d.children.length+1]);
//                 }
//
//                 if (d.children) {
//                     d.children.map(function (child, i) {
//                         return { value: child.loc, idx: i };
//                     }).sort(function (a, b) {
//                         return b.loc - a.loc;
//                     }).forEach(function (child, i) {
//                         d.children[child.idx].color = colors(i);
//                     });
//                 }
//
//                 return d.color;
//             };
//
//             console.log(this.g);
//             var allPath = this.g.selectAll('path')
//                 .data(partition.nodes(hierarchy))
//               .enter().append('path')
//                 .attr('d', arc)
//                 .attr('fill', color);
//
//             updateLabels(hierarchy);
//
//             // --- set on-click event handler ---
//
//             var center = this.g.append('text')
//                 .attr('class', 'stat-center')
//                 .style('text-anchor', 'middle')
//                 .style('pointer-events', 'none')
//                 .text('All Languages');
//
//             allPath.on('mouseover', function (d) {
//                     d3.select(this).style('opacity', '0.8');
//                 })
//                 .on('mouseout', function (d) {
//                     d3.select(this).style('opacity', '1');
//                 })
//                 .on('click', function (datum) {
//                     if (!datum.children) return;
//
//                     allPath.transition()
//                         .duration(750)
//                         .attrTween('d', arcTween(datum));
//
//                     // set labels
//                     var center = this.g.select('.stat-center')
//                         .text(datum.name);
//
//                     updateLabels(datum);
//                 });
//
//             function arcTween(datum) {
//                 var thetaDomain  = d3.interpolate(theta.domain(),
//                     [datum.x, datum.x + datum.dx]);
//                 var radiusDomain = d3.interpolate(radius.domain(),
//                     [datum.y, 1]);
//                 var radiusRange  = d3.interpolate(radius.range(),
//                     [datum.y ? centerCircleSize : 0, maxRadius]);
//
//                 return function calculateNewPath(d, i) {
//                     if (i != 0) {
//                         return function interpolatePathForRoot(time) {
//                             return arc(d);
//                         };
//                     } else {
//                         return function interpolatePathForNonRoot(time) {
//                             theta.domain(thetaDomain(time));
//                             radius.domain(radiusDomain(time)).range(radiusRange(time));
//                             return arc(d);
//                         };
//                     }
//                 };
//             }
//
//             // update labels
//             function updateLabels(d) {
//                 var dataset = d.children;
//
//                 d3.select('svg g.labels').selectAll('rect').remove();
//                 d3.select('svg g.labels').selectAll('text').remove();
//
//                 d3.select('svg g.labels').selectAll('rect')
//                     .data(dataset)
//                   .enter().append('rect')
//                     .attr('x', -20)
//                     .attr('y', function (d, i) {
//                         return i * 30 - 15;
//                     })
//                     .attr('width', 15)
//                     .attr('height', 15)
//                     .attr('fill', function (d) {
//                         return d.color;
//                     });
//
//                 d3.select('svg g.labels').selectAll('text')
//                     .data(dataset)
//                   .enter()
//                     .append('a')
//                     .attr('xlink:href', function (d) {
//                         return d.url;
//                     })
//                     .append('text')
//                     .attr('y', function (d, i) {
//                         return i * 30;
//                     })
//                     .text(function (d) {
//                         var name = d.name.replace(/^.*\//, '');
//                         return name;
//                     });
//             }
//         }(this))
//         .fail(function () {
//             console.log('fail to get JSON');
//         });
//     };
//
//     return LangsStatGraph;
// })();
//
// $(document).ready(function () {
//     if ($('.langs-stat').length) {
//         // drawPartitionGraph();
//         var graph = new LangsStatGraph(800, 500);
//         graph.draw();
//     }
// });
