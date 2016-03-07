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
        this.rootPath;
        this.currentRootPath;

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
                children: stat,
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
            .attr('class', function (d) {
                if (!d.parent) return 'graph-root';
            })
            .attr('d', this.arc)
            .attr('fill', color);

        this.rootPath = hierarchy;
        this.currentRootPath = this.rootPath;

        this.updateLabels(hierarchy);

        // --- set on-click event handler ---

        var center = this.g.append('text')
            .attr('class', 'stat-center')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .text('All Languages');

        this.allPath
            .on('mouseover', function (d) {
                d3.select(this).style('opacity', 0.8);
            })
            .on('mouseout', function (d) {
                d3.select(this).style('opacity', 1);
            })
            .on('click', this.clickHandler.bind(this));

        // this.svg.select('.top')
        //     .on('click', () => {
        //         this.clickHandler(this.rootPath);
        //     });
    }

    // click handler
    clickHandler(d) {
        if (!d.children) return;
        this.currentRootPath = d;
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

        // remove all and append labels

        labels.selectAll('rect').remove();
        labels.selectAll('text').remove();

        // create a colored box next to the labels
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

        // generate html like:
        // <a xlink:href="#" target="_blank">
        //   <text y="60">JavaScript</text>
        // </a>
        labels.selectAll('text')
            .data(dataset)
          .enter()
            // append <a xlink:href="#" target="_blank"></a>
            .append('a')
            .attr('xlink:href', function (d) {
                return d.url;
            })
            .attr('target', '_blank')
            // insert <text y="30">Repo Name</text> to <a> tag
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
