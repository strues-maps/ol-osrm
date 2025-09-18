/* eslint-disable prefer-template */

import polyline from '@mapbox/polyline'
import osrmTextInstructions from 'osrm-text-instructions'
import Waypoint from './waypoint'

const defaults = {
    serviceUrl: 'https://router.project-osrm.org/route/v1',
    profile: 'driving',
    timeout: 30 * 1000,
    routingOptions: {
        alternatives: true,
        steps: true
    },
    polylinePrecision: 5,
    useHints: true,
    suppressDemoServerWarning: false,
    language: 'en'
};

/**
 * Works against OSRM's new API in version 5.0; this has
 * the API version v1.
 */
export default class OSRMv1 {
    constructor(options) {
        this.options = Object.assign({}, defaults, options)
        this._hints = {locations: []};

        if (!this.options.suppressDemoServerWarning && this.options.serviceUrl.indexOf('//router.project-osrm.org') >= 0) {
            console.warn('You are using OSRM\'s demo server. ' +
                    'Please note that it is **NOT SUITABLE FOR PRODUCTION USE**.\n' +
                    'Refer to the demo server\'s usage policy: ' +
                    'https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy\n\n' +
                    'To change, set the serviceUrl option.\n\n' +
                    'Please do not report issues with this server to neither ' +
                    'Leaflet Routing Machine or OSRM - it\'s for\n' +
                    'demo only, and will sometimes not be available, or work in ' +
                    'unexpected ways.\n\n' +
                    'Please set up your own OSRM server, or use a paid service ' +
                    'provider for production.');
        }
    }

    route(waypoints, callback, context, options) {
        let url;
        let timedOut;
        let waypointsCopy;

        options = Object.assign({}, this.options.routingOptions, options);

        url = this.buildRouteUrl(waypoints, options);
        if (this.options.requestParameters) {
            url += Object.keys(this.options.requestParameters).reduce(
                function (carry, param, idx) {
                    return carry +
                        (idx > 0 ? '&' : '') +
                        param + '=' + window.encodeURIComponent(this.options.requestParameters[param]);
                },
                url.indexOf('?') >= 0 ? '&' : '?'
            )
        }

        timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            callback.call(context || callback, {
                status: -1,
                message: 'OSRM request timed out.'
            });
        }, this.options.timeout);

        // Create a copy of the waypoints, since they
        // might otherwise be asynchronously modified while
        // the request is being processed.
        waypointsCopy = [];
        for (let i = 0; i < waypoints.length; i++) {
            let wp = waypoints[i];
            waypointsCopy.push(new Waypoint(wp.lngLat, wp.name, wp.options));
        }

        return window.fetch(url)
            .then(resp => {
                clearTimeout(timer);
                if (timedOut) {
                    return;
                }

                return resp.json();
            })
            .then(data => {
                return this._routeDone(data, waypointsCopy, options, callback, context);
            })
            .catch(err => {
                callback.call(context || callback, err);
            });
    }

    _routeDone(response, inputWaypoints, options, callback, context) {
        let alts = [];

        try {
            context = context || callback;
            if (response.code !== 'Ok') {
                callback.call(context, {
                    status: response.code
                });
                return;
            }

            let actualWaypoints = this._toWaypoints(inputWaypoints, response.waypoints);

            for (let i = 0; i < response.routes.length; i++) {
                let route = this._convertRoute(response.routes[i]);
                route.inputWaypoints = inputWaypoints;
                route.waypoints = actualWaypoints;
                route.properties = {isSimplified: !options || !options.geometryOnly || options.simplifyGeometry};
                alts.push(route);
            }

            this._saveHintData(response.waypoints, inputWaypoints);
        } catch (ex) {
            throw {
                status: -3,
                message: ex.toString()
            }
        }

        callback.call(context, null, alts);
    }

    _convertRoute(responseRoute) {
        let result = {
            name: '',
            coordinates: [],
            instructions: [],
            summary: {
                totalDistance: responseRoute.distance,
                totalTime: responseRoute.duration
            }
        };
        let legNames = [],
            waypointIndices = [],
            index = 0,
            legCount = responseRoute.legs.length,
            hasSteps = responseRoute.legs[0].steps.length > 0,
            i,
            j,
            leg,
            step,
            geometry,
            coordinate,
            type,
            modifier,
            text,
            stepToText;

        if (this.options.stepToText) {
            stepToText = this.options.stepToText;
        } else {
            let textInstructions = osrmTextInstructions('v5', this.options.language);
            stepToText = textInstructions.compile.bind(textInstructions, this.options.language);
        }

        for (i = 0; i < legCount; i++) {
            leg = responseRoute.legs[i];
            legNames.push(leg.summary && leg.summary.charAt(0).toUpperCase() + leg.summary.substring(1));
            for (j = 0; j < leg.steps.length; j++) {
                step = leg.steps[j];
                geometry = this._decodePolyline(step.geometry);
                coordinate = geometry && geometry.length > 0 ? geometry[0] : null;
                result.coordinates = [...result.coordinates, ...geometry];
                type = this._maneuverToInstructionType(step.maneuver, i === legCount - 1);
                modifier = this._maneuverToModifier(step.maneuver);
                text = stepToText(step);

                if (type) {
                    if ((i == 0 && step.maneuver.type == 'depart') || step.maneuver.type == 'arrive') {
                        waypointIndices.push(index);
                    }

                    result.instructions.push({
                        type,
                        distance: step.distance,
                        time: step.duration,
                        road: step.name,
                        direction: this._bearingToDirection(step.maneuver.bearing_after),
                        exit: step.maneuver.exit,
                        index,
                        mode: step.mode,
                        modifier,
                        text,
                        coordinate
                    });
                }

                index += geometry.length;
            }
        }

        result.name = legNames.join(', ');
        if (!hasSteps) {
            result.coordinates = this._decodePolyline(responseRoute.geometry);
        } else {
            result.waypointIndices = waypointIndices;
        }

        return result;
    }

    _bearingToDirection(bearing) {
        let oct = Math.round(bearing / 45) % 8;
        return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][oct];
    }

    _maneuverToInstructionType(maneuver, lastLeg) {
        switch (maneuver.type) {
            case 'new name':
                return 'Continue';
            case 'depart':
                return 'Head';
            case 'arrive':
                return lastLeg ? 'DestinationReached' : 'WaypointReached';
            case 'roundabout':
            case 'rotary':
                return 'Roundabout';
            case 'merge':
            case 'fork':
            case 'on ramp':
            case 'off ramp':
            case 'end of road':
                return this._camelCase(maneuver.type);
                // These are all reduced to the same instruction in the current model
                //case 'turn':
                //case 'ramp': // deprecated in v5.1
            default:
                return this._camelCase(maneuver.modifier);
        }
    }

    _maneuverToModifier(maneuver) {
        let modifier = maneuver.modifier;

        switch (maneuver.type) {
            case 'merge':
            case 'fork':
            case 'on ramp':
            case 'off ramp':
            case 'end of road':
                modifier = this._leftOrRight(modifier);
        }

        return modifier && this._camelCase(modifier);
    }

    _camelCase(s) {
        let words = s.split(' '),
                result = '';
        for (let i = 0, l = words.length; i < l; i++) {
            result += words[i].charAt(0).toUpperCase() + words[i].substring(1);
        }

        return result;
    }

    _leftOrRight(d) {
        return d.indexOf('left') >= 0 ? 'Left' : 'Right';
    }

    _decodePolyline(routeGeometry) {
        let cs = polyline.decode(routeGeometry, this.options.polylinePrecision),
                result = new Array(cs.length),
                i;
        for (i = cs.length - 1; i >= 0; i--) {
            let c = cs[i]
            result[i] = [c[1], c[0]];
        }

        return result;
    }

    _toWaypoints(inputWaypoints, vias) {
        let wps = [],
                i,
                viaLoc;
        for (i = 0; i < vias.length; i++) {
            viaLoc = vias[i].location;
            wps.push(new Waypoint([viaLoc[1], viaLoc[0]],
                    inputWaypoints[i].name,
                    inputWaypoints[i].options));
        }

        return wps;
    }

    buildRouteUrl(waypoints, options) {
        let locations = [];
        let hints = [];
        let computeInstructions = true;
        let computeAlternative = true;

        for (let i = 0; i < waypoints.length; i++) {
            let wp = waypoints[i];
            let lngLat = wp.lngLat;
            locations.push(lngLat[0] + ',' + lngLat[1]);
            hints.push(this._hints.locations[this._locationKey(lngLat)] || '');
        }

        return this.options.serviceUrl + '/' + this.options.profile + '/' +
                locations.join(';') + '?' +
                (options.geometryOnly ? (options.simplifyGeometry ? '' : 'overview=full') : 'overview=false') +
                '&alternatives=' + computeAlternative.toString() +
                '&steps=' + computeInstructions.toString() +
                (this.options.useHints ? '&hints=' + hints.join(';') : '') +
                (options.allowUTurns ? '&continue_straight=' + !options.allowUTurns : '');
    }

    _locationKey(location) {
        return location[0] + ',' + location[1];
    }

    _saveHintData(actualWaypoints, waypoints) {
        let loc;
        this._hints = {
            locations: {}
        };
        for (let i = actualWaypoints.length - 1; i >= 0; i--) {
            loc = waypoints[i].lngLat;
            this._hints.locations[this._locationKey(loc)] = actualWaypoints[i].hint;
        }
    }
}
