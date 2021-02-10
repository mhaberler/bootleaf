var vectorTileStyling = {

    water: {
        fill: true,
        weight: 1,
        fillColor: '#06cccc',
        color: '#06cccc',
        fillOpacity: 0.2,
        opacity: 0.4,
    },
    admin: {
        weight: 1,
        fillColor: 'pink',
        color: 'pink',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    waterway: {
        weight: 1,
        fillColor: '#2375e0',
        color: '#2375e0',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    landcover: {
        fill: true,
        weight: 1,
        fillColor: '#53e033',
        color: '#53e033',
        fillOpacity: 0.2,
        opacity: 0.4,
    },
    landuse: {
        fill: true,
        weight: 1,
        fillColor: '#e5b404',
        color: '#e5b404',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    park: {
        fill: true,
        weight: 1,
        fillColor: '#84ea5b',
        color: '#84ea5b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    boundary: {
        weight: 1,
        fillColor: '#c545d3',
        color: '#c545d3',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    aeroway: {
        weight: 1,
        fillColor: '#51aeb5',
        color: '#51aeb5',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    road: {	// mapbox & nextzen only
        weight: 1,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    tunnel: {	// mapbox only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    bridge: {	// mapbox only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    transportation: {	// openmaptiles only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    transit: {	// nextzen only
        weight: 0.5,
        fillColor: '#f2b648',
        color: '#f2b648',
        fillOpacity: 0.2,
        opacity: 0.4,
// 					dashArray: [4, 4]
    },
    building: {
        fill: true,
        weight: 1,
        fillColor: '#2b2b2b',
        color: '#2b2b2b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    water_name: {
        weight: 1,
        fillColor: '#022c5b',
        color: '#022c5b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    transportation_name: {
        weight: 1,
        fillColor: '#bc6b38',
        color: '#bc6b38',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    place: {
        weight: 1,
        fillColor: '#f20e93',
        color: '#f20e93',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    housenumber: {
        weight: 1,
        fillColor: '#ef4c8b',
        color: '#ef4c8b',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    poi: {
        weight: 1,
        fillColor: '#3bb50a',
        color: '#3bb50a',
        fillOpacity: 0.2,
        opacity: 0.4
    },
    earth: {	// nextzen only
        fill: true,
        weight: 1,
        fillColor: '#c0c0c0',
        color: '#c0c0c0',
        fillOpacity: 0.2,
        opacity: 0.4
    },


    // Do not symbolize some stuff for mapbox
    country_label: [],
    marine_label: [],
    state_label: [],
    place_label: [],
    waterway_label: [],
    poi_label: [],
    road_label: [],
    housenum_label: [],


    // Do not symbolize some stuff for openmaptiles
    country_name: [],
    marine_name: [],
    state_name: [],
    place_name: [],
    waterway_name: [],
    poi_name: [],
    road_name: [],
    housenum_name: [],
};

// Monkey-patch some properties for nextzen layer names, because
// instead of "building" the data layer is called "buildings" and so on
vectorTileStyling.buildings  = vectorTileStyling.building;
vectorTileStyling.boundaries = vectorTileStyling.boundary;
vectorTileStyling.places     = vectorTileStyling.place;
vectorTileStyling.pois       = vectorTileStyling.poi;
vectorTileStyling.roads      = vectorTileStyling.road;




var config = {
    "title": "Radiosonde", // tab  name
    "start": {
        // "maxZoom": 16,
        "center": [47, 15],
        "zoom": 3,
        "attributionControl": true,
        "zoomControl": false
    },
    "about": {
        "title": "Radiosonde ascents for the masses!",
        "contents": "<p>see https://github.com/mhaberler/radiosonde</p>"
    },
    "controls": {
        "zoom": {
            "position": "topleft"
        },
        "leafletGeocoder": {
            //https://github.com/perliedman/leaflet-control-geocoder
            "collapsed": false,
            "position": "topleft",
            "placeholder": "Search for a location",
            "type": "OpenStreetMap",
        },
        "TOC": {
            //https://leafletjs.com/reference-1.0.2.html#control-layers-option
            "collapsed": true,
            "uncategorisedLabel": "Layers",
            "position": "topright",
            "toggleAll": true
        },
        "bookmarks": {
            "position": "bottomright",
            "places": [{
                    "latlng": [
                        46.56, 13.0
                    ],
                    "zoom": 7,
                    "name": "Alps",
                    "id": "alps4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        47.5, 13.6
                    ],
                    "zoom": 8,
                    "name": "Austria",
                    "id": "austria4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        -29.17, 24.27
                    ],
                    "zoom": 6,
                    "name": "South Africa",
                    "id": "sa4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        50.2, 11.22
                    ],
                    "zoom": 6,
                    "name": "Central Europe",
                    "id": "ce4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        63.6, 18.1
                    ],
                    "zoom": 5,
                    "name": "Scandinavia",
                    "id": "sc4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        41.282, -90.54
                    ],
                    "zoom": 4,
                    "name": "The Colonies",
                    "id": "colonies4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        -71.76, 120.72
                    ],
                    "zoom": 3,
                    "name": "Antarctica",
                    "id": "aa4711",
                    "editable": true,
                    "removable": true
                },
                {
                    "latlng": [
                        11.826, 129.63
                    ],
                    "zoom": 6,
                    "name": "Philippines",
                    "id": "pp4711",
                    "editable": true,
                    "removable": true
                }


            ]
        }
    },

    // "activeTool": "filterWidget", // options are identify/coordinates/queryWidget
    "basemaps": ['OpenStreetMap', 'Aerial'],
    "bing_key": "Ai97yaqNocJJDGpibB4EnQ-0AoEb0prY4jZ3OASp8rf8jHFET_KsVtgGx2MDku6F",

    "tocCategories": [{
            "name": "Airspaces",
            "layers": [
                "airspace-at",
                "airspace-it",

            ]
        },
        // {
        // 	"name": "Actual Event Post Data",
        // 	"layers" : [
        // 		"events_bushfire", "events_drought", "events_earthquake", "events_flood", "events_general", "events_severeThunderstorm", "events_severeWeather",
        // 		"events_tornado", "events_tropicalCyclone"
        // 	]
        // }
    ],
    "layers": [
        //        radiosonde.mah.priv.at/static/airspace# austria_at.geojson
        // Historic layers

        {
            "id": "airspace-at",
            "name": "AT Airspace",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/static/airspace/austria_at.geojson",
            "opacity": 0.1,
            "visible": false,
        },
        {
            "id": "airspace-it",
            "name": "IT Airspace",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/static/airspace/italy_it.geojson",
            "opacity": 0.1,
            "visible": false,
        },
        {
            "id": "eu-countries",
            "name": "EU countries",
            "type": "geoJSON",
            "url": "https://radiosonde.mah.priv.at/static/eu-countries.geojson",
            "opacity": 0.1,
            "visible": false,
        },
        {
            "id": "nextzen",
            "name": "nextzen Demo",
            "type": "nextzenMvtLayer",
            "url": "https://tile.nextzen.org/tilezen/vector/v1/512/all/{z}/{x}/{y}.mvt?api_key={apikey}",
            // "opacity": 0.1,
            "apikey": 'gCZXZglvRQa6sB2z7JzL1w',
            //mah radiosonde apikey: 'aPvDbkMQRAehOzfpj2Ql3A',
            "rendererFactory": L.canvas.tile,
            "attribution": '<a href="https://nextzen.com/">&copy; NextZen</a>, <a href="http://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a> contributors',
            vectorTileLayerStyles: vectorTileStyling,
            //apikey: 'gCZXZglvRQa6sB2z7JzL1w',
            //apikey: 'aPvDbkMQRAehOzfpj2Ql3A',

            "visible": false,
        },



    ],
    // "TOC": {
    //     //https://leafletjs.com/reference-1.0.2.html#control-layers-option
    //     "collapsed": true,
    //     "uncategorisedLabel": "Layers",
    //     "position": "topright",
    //     "toggleAll": true
    // },
    "projections": [{
        4269: '+proj=longlat +ellps=GRS80 +datum=NAD83 +no_defs '
    }],
    "highlightStyle": {
        "weight": 2,
        "opacity": 1,
        "color": 'white',
        "dashArray": '3',
        "fillOpacity": 0.5,
        "fillColor": '#E31A1C',
        "stroke": true
    },
}
