import { h, render } from 'preact';

import OSRMv1 from './osrm-v1';
import Waypoint from './waypoint';
import ControlWrapper from './components/ControlWrapper.jsx';
import Control from 'ol/control/Control';

class OlrmControl extends Control {
    constructor(options) {
        options = Object.assign({}, options);
        options.waypoints = options.waypoints && options.waypoints.map(wp => {
            if (wp instanceof Waypoint) {
                return wp;
            }

            return new Waypoint(wp);
        });

        options.router = options.router || new OSRMv1(options);
        options.waypointsListener = options.waypointsListener || null;
        options.routesListener = options.routesListener || null;

        const container = document.createElement('div');
        container.setAttribute("id", "olrm-container");
        render(h(ControlWrapper, options), container);

        super({
            element: container,
            ...options
        });

        this.options = options;
        this.container = container;
    }
}

export default {
    Control: OlrmControl
};
