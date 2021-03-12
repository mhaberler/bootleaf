"use strict";
var toplevel = 'https://radiosonde.mah.priv.at/';
var datadir = 'data-v2/';
var datapath = toplevel + datadir;
var summary_url = datapath + 'summary.geojson';
var summary_br = 'summary.geojson.br';
var sondeinfo_url = toplevel + 'static/' + 'sondeinfo.json';
var isTouchDevice = isMobile();
var summary = null;
var summaryFmt = 0;
var summaryGenerated = 0;
var markers = null;
var stations = {}; // features indexed by station_id
var sondeinfo = {};
var mobileMarkerList = [];
var markerGroups = [];
let zeroK = 273.15;
let drawAscents = 1;
var bookmarkLife = 2000;
var maxHrs = 48;
var agelimit;
var agelimitDefault = -24;
var slowTick, fastTick;
var slowTickInterval = 900 * 1000; // 15min
var fastTickInterval = 5 * 1000;
var maxAge = 3600; //delete ascent.data after an hour


var markerSelectedColor = "OrangeRed";
var viridisStops = ['#440154', '#482777', '#3F4A8A', '#31678E', '#26838F', '#1F9D8A', '#6CCE5A', '#B6DE2B', '#FEE825'];
var chroma_scale = chroma.scale(viridisStops);
var path_colors = {
    "simulated": {
        color: 'DarkOrange'
    },
    "origin": {
        color: 'MediumBlue'
    }
}

function unixTimestamp() {
    return Math.round((new Date()).getTime() / 1000);
}



function uv2speed(u, v) {
    return Math.sqrt(u * u + v * v);
}

function deg(x) {
    return (180 / Math.PI) * x
}

function uv2dir(u, v) {
    var d = deg(Math.PI / 2 - Math.atan2(-v, -u));
    while (d < 0)
        d = (d + 360) % 360;
    return d;
}

function round3(value) {
    return Math.round(value * 1000) / 1000;
}

function round6(value) {
    return Math.round(value * 1000000) / 1000000;
}

// https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
function downloadObjectAs(type, exportObj, exportName) {
    if (type == 'CSV') {
        var dataStr = "data:text/csv;charset=utf-8," + geojson2dsv(exportObj);
        var fn = exportName + ".csv";
    }
    else if (type == 'GeoJSON') {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
        var fn = exportName + ".json";
    }
    else return;

    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fn);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function addHeaders(table, keys) {
    var row = table.insertRow();
    for (var i = 0; i < keys.length; i++) {
        var cell = row.insertCell();
        cell.appendChild(document.createTextNode(keys[i]));
    }
}

$('#detail').on('click', function(e) {
    $('#detailPane').collapse('toggle');
    $('#skew-t').collapse('toggle');
});

function genDownload(ascent) {
    $('.dowload-choice').off();
    $('.dowload-choice').on('click', (function(e) {
        return function(e) {
            var fn = DownloadFilename(ascent);
            downloadObjectAs($(this).text(), ascent, fn)
        };
    }(ascent)));
}

function bold(s) {
    return "<b>" + s + "</b>";
}

function minutes(sec) {
    var m = sec / 60;
    return round(m);
}

function genDetail(fc, container) {

    var p = fc.properties;
    var para = "<p>";
    var brk = "<br>";
    var detail = document.getElementById(container);
    var html;
    var s = "Station: " + p.station_name;
    if (p.id_type == "mobile")
        s += " (mobile)";
    if (p.id_type == "wmo")
        s += " (WMO id: " + p.station_id + ")";

    // https://www.google.com/maps/search/?api=1&query=latitude,longitude

    html = bold(s) + para + para;
    var lat, lon, ns, ew;
    if (p.lat > 0) {
        ns = "N";
        lat = p.lat;
    }
    else {
        ns = "S";
        lat = -p.lat;
    }
    if (p.lon > 0) {
        ew = "E";
        lon = p.lon;
    }
    else {
        ew = "W";
        lon = -p.lon;
    }
    html += bold("location:   ") +
        "<a targe=\"_blank\" href=\"https://www.google.com/maps/search/?api=1&zoom=12&query=" +
        p.lat + "," + p.lon + "\">" +
        round6(lat) + ns + " " + round6(lon) + ew + " </a>" + brk;

    html += bold("elevation:   ") + p.elevation + "m" + brk;
    if (p.text)
        html += bold("text:   ") + p.text + brk;

    html += bold("samples:   ") + fc.features.length + brk;

    html += bold("track source:   ");
    if (p.path_source == "origin")
        html += "   GPS";
    if (p.path_source == "simulated")
        html += "   simulated";

    html += brk;
    html += bold("Synoptic time:   ") + timeString(p.syn_timestamp) + brk;
    if (p.firstSeen)
        html += bold("First seen:   ") + timeString(p.firstSeen) + brk;
    if (p.lastSeen)
        html += bold("Last seen:   ") + timeString(p.lastSeen) +
        " (" + minutes(p.lastSeen - p.firstSeen) + " min later)" + brk;

    if (p.arrived)
        html += bold("Arrived:   ") + timeString(p.arrived) + brk;

    
    if (p.processed)
        html += bold("Online:   ") + timeString(p.processed) +
        " (" + minutes(p.processed - p.arrived) + " min after arrival)" + brk;
    
    html += para + bold("Sonde:") + brk;
    if (p.sonde_type && sondeinfo.sonde_types[p.sonde_type])
        html += bold("type:   ") + sondeinfo.sonde_types[p.sonde_type] + brk;
    if (p.sonde_serial)
        html += bold("serial number:   ") + p.sonde_serial + brk;
    if (p.sonde_frequency)
        html += bold("transmit frequency:   ") + round3(p.sonde_frequency / 1000) / 1000 + " MHz" + brk;
    if (p.sonde_swversion)
        html += bold("SW version:   ") + p.sonde_swversion + brk;
    if (p.sonde_humcorr && sondeinfo.sonde_humcorr[p.sonde_humcorr])
        html += bold("humidity correction:   ") + sondeinfo.sonde_humcorr[p.sonde_humcorr] + brk;


    if (p.sonde_psensor && sondeinfo.sonde_psensor[p.sonde_psensor])
        html += bold("pressure sensor:   ") + sondeinfo.sonde_psensor[p.sonde_psensor] + brk;
    if (p.sonde_tsensor && sondeinfo.sonde_tsensor[p.sonde_tsensor])
        html += bold("temperature sensor:   ") + sondeinfo.sonde_tsensor[p.sonde_tsensor] + brk;
    if (p.sonde_hsensor && sondeinfo.sonde_hsensor[p.sonde_hsensor])
        html += bold("humidity sensor:   ") + sondeinfo.sonde_hsensor[p.sonde_hsensor] + brk;
    if (p.sonde_humcorr && sondeinfo.sonde_humcorr[p.sonde_humcorr])
        html += bold("humidity correction:   ") + sondeinfo.sonde_humcorr[p.sonde_humcorr] + brk;

    html += para + bold("Data reference:") + brk;
    if (p.channel)
	html += bold("source:   ") + p.channel + brk;
    html += bold("format:   ") + p.repfmt + "/" + p.encoding + brk;
    if (p.origin_member)
        html += bold("source file:   ") + p.origin_member + brk;
    if (p.origin_archive)
        html += bold("source archive:   ") + p.origin_archive + brk;
    if (p.fmt)
        html += bold("detail file format:   ") + " version " + p.fmt + brk;

    detail.innerHTML = html;
}


function plotSkewT(geojson) {
    var samples = [];
    var windsamples = 0;
    for (var i in geojson.features) {
        var p = geojson.features[i].properties;
        var sample = {
            "press": round3(p['pressure']),
            "hght": round3(p['gpheight']),
            "temp": round3(p['temp'] - zeroK),
            "dwpt": round3(p['dewpoint'] - zeroK),
        };

        if ((typeof p.wind_u === "undefined") || (typeof p.wind_v === "undefined")) {
            samples.push(sample);
            continue;
        }
        sample["wdir"] = round3(uv2dir(p['wind_u'], p['wind_v']));
        sample["wspd"] = round3(uv2speed(p['wind_u'], p['wind_v']));
	windsamples += 1;
        samples.push(sample);
    }
    skewt.plot(samples);
    genDetail(geojson, 'detailPane');
    genDownload(geojson);
    
    $('#skew-t').collapse('show')
    $('#detailPane').collapse('hide');
    $("#sidebar").show("slow");
    console.log("wind samples:", windsamples);
}

function drawpath(feature) {
    var path_source = feature.properties.path_source;
    var lineCoordinate = [];

    for (var i in feature.features) {
        var pointJson = feature.features[i];
        var coord = pointJson.geometry.coordinates;
        lineCoordinate.push([coord[1], coord[0]]);
    }
    L.polyline(lineCoordinate, path_colors[path_source]).addTo(bootleaf.map);
}

function hotfix(geojson) {

    // bring legacy detail files up to current fmt -
    // fix geojson objects in-place depending on various bug conditions:

    var fix_u_v = ((geojson.properties.repfmt === 'fm35') &&
        (geojson.properties.fmt < 5));

    var fix_pressure = ((geojson.properties.repfmt === 'fm94') &&
        (geojson.properties.fmt < 2));

    // walk the object and apply any fixes known for this version
    for (var i in geojson.features) {
        var p = geojson.features[i].properties;

        // pre-V2 BUFR files had pressure in Pa
        // make it hPa
        if (fix_pressure) {
            p.pressure = p.pressure * 0.01;
        }

        // pre-V5 netCDF files had u,v in knots
        // make it m/s
        if (fix_u_v) {
            if (typeof p.wind_u !== "undefined") {
                p.wind_u = p.wind_u / 1.94384;
            }
            if (typeof p.wind_v !== "undefined") {
                p.wind_v = p.wind_v / 1.94384;
            }
        }
    }
    // set the fmt to the current fmt so this is
    // idempotent
    geojson.properties.fmt = summaryFmt;

    console.log("fix_u_v", fix_u_v);
    console.log("fix_pressure", fix_pressure);
}


var skewt = new SkewT('#skew-t');

function loadAscent(url, ascent, completion) {
    $.getJSON(url,
        (function(a) {
            return function(geojson) {
                hotfix(geojson);
                // add in the station name from stations
                geojson.properties.station_name = stations[geojson.properties.station_id].properties.name;
                a.data = geojson;
                a.data.properties.last_reference = unixTimestamp();
                completion(geojson);
                drawpath(geojson);
            };
        }(ascent))
    );
}

// 2021-03-03T00:00:00.000Z//
//29231_2021_03030000Z
function DownloadFilename(a) {
    var ts = new Date(a.properties.syn_timestamp * 1000).toJSON();
    return (a.properties.station_id + '_' +
        ts.substring(0, 4) +
        ts.substring(5, 7) +
        ts.substring(8, 10) + '_' +
        ts.substring(11, 13) +
        ts.substring(14, 16) + 'Z').replace(/-/g, '_');
}

// toJSON: 2021-02-09T15:54:08.639Z
function timeString(unxiTimestamp) {
    var ts = new Date(unxiTimestamp * 1000).toJSON();
    return ts.substring(0, 10) + ' ' + ts.substring(11, 16) + 'Z';
}

// due to setup errors of various stations, the same ascents
// might be reported via MADIS and GISC but with different timestamps.
// there is no such thing as  a unique ascent UUID.
// usually it's an hour apart and it seems to be mostly a German problem
// see the Meining, Muenchen-Oberschleissheim and Budapest stations
// for examples
// on the theory that no station flies ascents less than ascentFuzzValue
// seconds apart, we silently drop the netCDF ascent within that timeframe
// provided the preferBUFR flag is true.
var ascentFuzzValue = 3650;
var firstItem = -1;

function ascentItem(ts, klass, index) {
    if (firstItem < 0)
        firstItem = index;
    var a = document.createElement('a');
    a.setAttribute('index-value', index);
    a.classList.add('dropdown-item');
    a.classList.add('ascent-choice');
    a.classList.add(klass);
    a.appendChild(document.createTextNode(timeString(ts)));
    return a;
}

function populateSidebar(feature, preferBUFR) {
    firstItem = -1;
    $('.ascent-choice').off('click');

    var first = feature.properties.ascents[0];
    var appendix = "";
    if (first.id_type == "mobile") {
        appendix = "<br> (mobile)";
    }
    $('#sidebarTitle').html(feature.properties.name + appendix);

    // history dropdown
    var ascentHistory = document.getElementById('ascentHistory');
    ascentHistory.innerHTML = '';

    var lastBUFRtime = -1;
    var len = feature.properties.ascents.length;
    for (var i = 0; i < len; i++) {
        var ascent = feature.properties.ascents[i];
        var doublette = false;
        if (i < (len - 1)) {
            if ((feature.properties.ascents[i].repfmt !=
                    feature.properties.ascents[i + 1].repfmt) &&
                Math.abs(feature.properties.ascents[i + 1].syn_timestamp -
                    feature.properties.ascents[i].syn_timestamp) < ascentFuzzValue) {
                // different sources and two ascents
                // within the ascentFuzzValue time span found
                doublette = true;
            }
        }
        if (!preferBUFR || !doublette) {
            // normal case - list them all
            ascentHistory.appendChild(ascentItem(ascent.syn_timestamp,
                "dropdown-" + ascent.repfmt + "-item", i));
            continue;
        }
        // we preferBUFR
        if (doublette) {
            if (ascent.repfmt == 'fm35') {
                // add the second one which is the BUFR
                ascentHistory.appendChild(ascentItem(feature.properties.ascents[i + 1].syn_timestamp,
                    "dropdown-" + feature.properties.ascents[i + 1].repfmt + "-item", i + 1));
                i += 1;
                continue;
            }
            // else take the first one
            ascentHistory.appendChild(ascentItem(feature.properties.ascents[i].syn_timestamp,
                "dropdown-" + feature.properties.ascents[i].repfmt + "-item", i));
            // and skip the netcCDF entry
            i += 1;
            continue;
        }
    }
    var ts = timeString(feature.properties.ascents[firstItem].syn_timestamp);
    $('#ascentChoice').html(ts);

    $('.ascent-choice').on('click', function() {
        var selected = $(this).attr('index-value');
        var ts = timeString(feature.properties.ascents[selected].syn_timestamp);
        $('#ascentChoice').html(ts);
        plotStation(feature, selected);
    })
}

var source_map = {
    netCDF: "madis/",
    BUFR: "gisc/",
    madis: "madis/",
    gisc: "gisc/"
};

// toJSON: 2021-02-09T15:54:08.639Z
function dataURI(sid, ascent) {
    var ts = new Date(ascent.syn_timestamp * 1000).toJSON();
    if (summaryFmt < 4) {
        return datapath +
            source_map[ascent.source] +
            sid.substring(0, 2) + "/" +
            sid.substring(2, 5) + "/" +
            sid + "_" +
            ts.substring(0, 4) +
            ts.substring(5, 7) +
            ts.substring(8, 10) + "_" +
            ts.substring(11, 13) +
            ts.substring(14, 16) +
            ts.substring(17, 19) +
            ".geojson";
    };
    if (summaryFmt < 6) {
        return datapath +
            source_map[ascent.source] +
            sid.substring(0, 2) + "/" +
            sid.substring(2, 5) + "/" +

            ts.substring(0, 4) + "/" +
            ts.substring(5, 7) + "/" +

            sid + "_" +
            ts.substring(0, 4) +
            ts.substring(5, 7) +
            ts.substring(8, 10) + "_" +
            ts.substring(11, 13) +
            ts.substring(14, 16) +
            ts.substring(17, 19) +
            ".geojson";
    }
        return datapath +
            ascent.repfmt + "/" +
            sid.substring(0, 2) + "/" +
            sid.substring(2, 5) + "/" +

            ts.substring(0, 4) + "/" +
            ts.substring(5, 7) + "/" +

            sid + "_" +
            ts.substring(0, 4) +
            ts.substring(5, 7) +
            ts.substring(8, 10) + "_" +
            ts.substring(11, 13) +
            ts.substring(14, 16) +
            ts.substring(17, 19) +
            ".geojson";
}

function plotStation(feature, index) {

    var ascent = feature.properties.ascents[index];
    // Set the link for this ascent
    var link = document.createTextNode("station " + ascent.station_id);
    var a = document.createElement('a');

    if (!ascent.hasOwnProperty('data')) {
        var u = dataURI(feature.properties.station_id, ascent);
        loadAscent(u, ascent, plotSkewT);
    }
    else {
        plotSkewT(ascent.data);
        ascent.data.properties.last_reference = unixTimestamp();
    }
}

// sidebar is being closed - deselect marker
$("#sidebar-hide-btn").click(function() {
    if (selectedMarker) {
        selectedMarker.setStyle({
            fillColor: selectedMarker.properties.color,
        });
        selectedMarker = null;
    }
    return false;
});

var selectedMarker = null;

function markerClicked(l) {
    if (selectedMarker) {
        // restore
        selectedMarker.setStyle({
            fillColor: selectedMarker.properties.color,
        });
    }
    var marker = l.target;
    marker.properties.color = marker.options.fillColor;

    marker.setStyle({
        fillColor: markerSelectedColor
    });
    selectedMarker = marker;
    var pref = $('#preferBUFR').prop('checked');
    populateSidebar(marker.feature, pref);
    plotStation(marker.feature, firstItem);
    // this pan should happen only after the sidebar is visible
    bootleaf.map.panTo(marker.getLatLng());
    // console.log(marker.getLatLng());
}

$('input[id="preferBUFR"]').mouseover(function() {
    $(this).attr("title", "prefer BUFR-based ascents over netCDF-based of nearly identical time (1h)");
});

$(function() {
    var preferBUFRdata = localStorage.getItem("preferBUFR");
    $("input[id='preferBUFR']").prop('checked', preferBUFRdata);
});

$('#preferBUFR').change(function() {
    if (this.checked) {
        localStorage.setItem("preferBUFR", 1);
    }
    else {
        localStorage.removeItem("preferBUFR");
    }
    populateSidebar(selectedMarker.feature, this.checked);
});

function isMobile() {
    // device detection
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0, 4))) {
        return true;
    }
    return false;
}

function now() {
    return Math.floor(Date.now() / 1000);
}

function latlngFromAscent(a) {
    return L.latLng(a.lat, a.lon);
}

function determineHeading(f) {
    var l = f.properties.ascents.length;
    if (l < 2)
        return 0;

    var second = Math.min(l - 1, 4);
    var ll1 = latlngFromAscent(f.properties.ascents[0]);
    var ll2 = latlngFromAscent(f.properties.ascents[second]);
    return L.GeometryUtil.bearing(ll2, ll1);

}

function gotSummary(data) {
    // console.log("gotSummary", data);
    summary = data;
    summaryFmt = summary.properties.fmt;
    summaryGenerated = summary.properties.generated;
    mobileMarkerList = [];

    markers = L.geoJson(data, {
        filter: function(f) {
            if (!f.properties.ascents.length) // no ascents available
                return false;
            stations[f.properties.station_id] = f;
            return true;
        },
        pointToLayer: function(feature, latlng) {
            let ascent = feature.properties.ascents[0];
            var ts = ascent.syn_timestamp;

            var age_hrs = (now() - ts) / 3600;
            var age_index = Math.round(Math.min(age_hrs, maxHrs - 1));
            age_index = Math.max(age_index, 0);
            var rounded_age = Math.round(age_hrs * 10) / 10;
            var markerColor = chroma_scale(1 - age_index / maxHrs);
            var marker;

            if (feature.properties.id_type === "mobile") {

                marker = L.boatMarker(latlng, {
                    fillColor: markerColor, // color of the boat
                    idleCircle: false, // if set to true, the icon will draw a circle if
                    // boatspeed == 0 and the ship-shape if speed > 0
                    // className: "context-menu-marker"
                    className: "zoomable-icon",
                });
                mobileMarkerList.push(marker);
                var h = determineHeading(feature);
                marker.setHeading(h);
                // console.log("mobile:", feature.properties.name, latlng, h);
            }
            else {
                marker = L.circleMarker(latlng, {
                    fillColor: markerColor,
                    radius: 10,
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8,
                    className: "context-menu-marker"
                });
            }
            var layergroup = L.layerGroup([marker]);

            marker.properties = {};
            marker.properties.visible = false;

            markerGroups.push(layergroup);

            var appendix = "";
            if (ascent.id_type == "mobile") {
                appendix = " (mobile)";
            }
            var sid = "";
            if (feature.properties.name != feature.properties.station_id) {
                sid = "station " + feature.properties.station_id + "<br>  ";
            }
            var content = "<b>" + feature.properties.name + "</b>" + appendix + "<br>  " +
            sid  +
            rounded_age + " hours old";
            if (isTouchDevice) {
                marker.on('click', markerClicked);
            }
            else {
                marker.bindTooltip(content, {
                        className: ascent.repfmt + 'CSSClass'
                    }).openTooltip()
                    .on('click', markerClicked);
                //                        .on('mouseover', mouseover);
            }
            return marker;
        }
    }); // .addTo(bootleaf.map);
    updateMarkers(agelimit);

    var station = getURLParameter("station");
    if (station) {
        f = stations[station];
        if (!f) {
            $.growl.error({
                message: "no such station: " + station
            });
        }
        else {
            // FIXME populate sidebar
            plotStation(f, 0);
        }
    }
}

function gotInfo(data) {
    sondeinfo = data;
}


function failedSummary(jqXHR, textStatus, err) {
    console.log("failedSummary", textStatus, err);
}

function failedInfo(jqXHR, textStatus, err) {
    console.log("failedInfo", textStatus, err);
}

function addMeta() {
    $.getJSON(summary_url)
        .done(function(data) {
            gotSummary(data);
        })
        .fail(function(jqXHR, textStatus, err) {
            failedSummary(jqXHR, textStatus, err);
        });
    $.getJSON(sondeinfo_url)
        .done(function(data) {
            gotInfo(data);
        })
        .fail(function(jqXHR, textStatus, err) {
            failedInfo(jqXHR, textStatus, err);
        });
}

function beforeMapLoads() {
    console.log("Before map loads function");
    $("#loading").show();

    agelimit = localStorage.getItem('agelimit');

    if (!agelimit) {
        agelimit = agelimitDefault;
        localStorage.setItem('agelimit', agelimit);
    }
    loadMap();
    addMeta();
}

var createDelayManager = function() {
    var timer = 0;
    return function(callback, ms, e) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms, e);
    };
}
var fadeoutManager = createDelayManager();

function closeBookmark(e) {
    $(".leaflet-popup-close-button")[0].click();
}

/**
 * Given a valid GeoJSON object, return a CSV composed of all decodable points.
 * @param {Object} geojson any GeoJSON object
 * @param {string} delim CSV or DSV delimiter: by default, ","
 * @param {boolean} [mixedGeometry=false] serialize just the properties
 * of non-Point features.
 * @example
 * var csvString = geojson2dsv(geojsonObject)
 */
function geojson2dsv(geojson, delim, mixedGeometry) {
    var rows = normalize(geojson).features
        .map(function(feature) {
            if (feature.geometry && feature.geometry.type === 'Point') {
                return Object.assign({}, feature.properties, {
                    lon: feature.geometry.coordinates[0],
                    lat: feature.geometry.coordinates[1],
                    ele: feature.geometry.coordinates[2]
                });
            }
            if (mixedGeometry) {
                return feature.properties;
            }
        })
        .filter(Boolean);

    return d3.dsvFormat(delim || ',').format(rows);
}


function afterMapLoads() {

    console.log("After map loads function");

    bootleaf.map.on('bookmark:show', function(e) {
        fadeoutManager(closeBookmark, bookmarkLife, e);
    });
    createAgeSlider(markers);


    //var layer = '';//define the layer that contains the markers
    bootleaf.map.on('zoomend', function() {
        var currentZoom = bootleaf.map.getZoom();
        console.log("zoom=", currentZoom);

        // mobileMarkerList.forEach(function(marker, index) {
        //     console.log("zooming", marker);
        // });

        var newzoom = '' + (2 * (currentZoom)) + 'px';
        $('#map .zoomable-icon').css({
            'width': newzoom,
            'height': newzoom
        });


        // //Update X and Y based on zoom level
        // var x= 50; //Update x
        // var y= 50; //Update Y
        // var LeafIcon = L.Icon.extend({
        //     options: {
        //         iconSize:     [x, y] // Change icon size according to zoom level
        //     }
        // });
        // layer.setIcon(LeafIcon);
    });
    $("#loading").hide();

    // start a background task
    // clear with clearInterval(intervalId);
    slowTick = setInterval(function() {
        // console.log("slow tick");
        slowTickHandler();
    }, slowTickInterval);

    fastTick = setInterval(function() {
        // console.log("fast tick");
        fastTickHandler();
    }, fastTickInterval);
}

function slowTickHandler() {
    // read the directory and check the timestamp on <toplevel>/data/summary.geojson.br
    //
    // the web server is configured to return directory listings as JSON
    // unfortunately mtime comes in RFC1123 format
    $.getJSON(toplevel + datadir, function(dirlist) {
        dirlist.forEach(function(entry, index) {
            if (entry.name === summary_br) {
                var ts = moment.utc(entry.mtime, 'ddd, DD MMM YYYY HH:mm:ss').unix();
                if (ts > summaryGenerated + 30) {
                    $.growl.notice({
                        title: "new ascents available",
                        message: "click reload to update"
                    });
                }
            }
        });
        console.log("dirlist", dirlist);
    });
};

// as ascents are clicked, ascent.data accumumulatess
// delete data which has not been referenced in a while
// to avoid memory usage growing forever
// doubles as an example how to walk all ascents
function fastTickHandler() {
    summary.features.forEach(function(station, si) {
        station.properties.ascents.forEach(function(ascent, ai) {
            if (ascent.hasOwnProperty('data')) {
                if (ascent.data.properties.hasOwnProperty('last_reference')) {
                    var age = unixTimestamp() - ascent.data.properties.last_reference;
                    if (age > maxAge) {
                        // console.log("cleanup: ",
                        //     ascent.data.properties.station_name,
                        //     timeString(ascent.data.properties.syn_timestamp));
                        delete ascent.data;
                    }
                }
            }
        });
    });
};

function updateMarkers(agelimit) {
    markerGroups.forEach(function(group, index) {
        var marker;
        for (var layer of group.getLayers()) {
            if ((layer instanceof L.CircleMarker)) {
                marker = layer;
                break;
            }
            if ((layer instanceof L.Marker)) {
                marker = layer;
                break;
            }
        };
        var ts = marker.feature.properties.ascents[0].syn_timestamp;
        var age_hrs = (now() - ts) / 3600;
        if (age_hrs > -agelimit) {
            if (marker.properties.visible) {
                bootleaf.map.removeLayer(group);
                marker.properties.visible = false;
            }
        }
        else {
            if (!marker.properties.visible) {
                bootleaf.map.addLayer(group);
                marker.properties.visible = true;
            }
        }
    });
    localStorage.setItem('agelimit', agelimit);
}




function createAgeSlider(markers) {

    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },
        onAdd: function() {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'mahinfo mahlegend');

            // Use a child input.
            var input = L.DomUtil.create('input');
            input.type = "text";
            input.id = "cutoff";

            // Insert the input as child of container.
            container.appendChild(input);

            var bs = jQuery(input).bootstrapSlider({
                min: -maxHrs,
                max: -3,
                value: agelimit,
                tooltip_position: 'top',
                tooltip: 'always',
                formatter: function(value) {
                    return 'newer than: ' + -value + ' hours';
                }
            }).on('change', function() {
                updateMarkers(parseFloat($(this).val()));
            });
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });
    bootleaf.map.addControl(new SequenceControl());
};
