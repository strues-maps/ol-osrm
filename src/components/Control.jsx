import { Component, Fragment } from 'preact';
import Marker from './Marker.jsx'
import RouteLine from './RouteLine.jsx'
import Geocoder from './Geocoder.jsx'
import Itinerary from './Itinerary.jsx'
import Waypoint from '../waypoint'

export default class Control extends Component {
    constructor(options) {
        super(options);
        this.routeInterval = 1000;
        this.waypointsUpdated = false;
        this.lastRouteTimestamp = +new Date();
        this.waypointsListener = options.onWaypointsUpdate ? options.onWaypointsUpdate : null;
        this.routesListener = options.onRoutesUpdate ? options.onRoutesUpdate : null;

        this.state = {
            waypoints: options.waypoints,
            geocoder: options.geocoder,
            routes: [],
            draggedWaypoint: null,
            routeDebounce: null,
            selectedRoute: null,
        };
        this.routeReceived = this.routeReceived.bind(this);
    }

    componentDidMount() {
        this.props.router.route(this.state.waypoints, this.routeReceived);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (this.waypointsUpdated && ((+new Date())-this.lastRouteTimestamp) >= this.routeInterval) {
            this.lastRouteTimestamp = +new Date();
            this.waypointsUpdated = false;
            nextProps.router.route(nextState.waypoints, this.routeReceived);
        }

        return true;
    }

    routeReceived(err, newRoutes) {
        this.setState({routes: newRoutes, selectedRoute: newRoutes[0]});
        if (this.routesListener) {
            setTimeout(
                () => {
                    const event = new CustomEvent(
                        'routesUpdate',
                        {
                            detail: {routes: newRoutes, selectedRoute: 0}
                        }
                    );
                    this.routesListener(event);
                },
                0
            );
        }
    }

    dragWaypoint(e, i, dragging) {
        if (this.state.routeDebounce) {
            clearTimeout(this.state.routeDebounce);
        }
        const now = +new Date();
        const firstNextRun = (this.lastRouteTimestamp || now) + this.routeInterval;
        const timeout = Math.max(0, firstNextRun - now);
        const routeDebounce = setTimeout(() => {
            const waypoints = this.state.waypoints.slice();
            const waypoint = new Waypoint(
                e.detail.lngLat,
                dragging ? waypoints[i].name : null,
                waypoints[i].options
            );
            waypoints[i] = waypoint;
            const state = {waypoints};
            if (!dragging) {
                state.draggedWaypoint = null;
            }
            this.waypointsUpdated = (
                Math.abs(e.detail.lngLat[0]-waypoint.lngLat[0]) > 0.001 ||
                Math.abs(e.detail.lngLat[0]-waypoint.lngLat[1]) > 0.001
            );
            this.setState(state);
            if (this.waypointsListener) {
                setTimeout(
                    () => {
                        const event = new CustomEvent(
                            'waypointsUpdate',
                            {
                                detail: {waypoint: waypoints[i], idx: i}
                            }
                        );
                        this.waypointsListener(event);
                    },
                    0
                );
            }
        }, timeout);
        this.setState({routeDebounce});
    }

    selectRoute(route) {
        this.setState({selectedRoute: route});
        if (this.routesListener) {
            setTimeout(
                () => {
                    const event = new CustomEvent(
                        'routesUpdate',
                        {
                            detail: {routes: this.state.routes, selectedRoute: this.state.routes.indexOf(route)}
                        }
                    );
                    this.routesListener(event);
                },
                0
            );
        }
    }

    setWaypoint(i, data) {
        const waypoints = this.state.waypoints.slice();
        const waypointsUpdated = (
            (Math.abs(data.lngLat[0]-waypoints[i].lngLat[0]) > 0.001) ||
            (Math.abs(data.lngLat[1]-waypoints[i].lngLat[1]) > 0.001)
        );

        waypoints[i] = new Waypoint(data.lngLat, data.name, data.options);
        this.setState({waypoints});

        if (waypointsUpdated) {
            if (this.waypointsListener) {
                setTimeout(
                    () => {
                        const event = new CustomEvent(
                            'waypointsUpdate',
                            {
                                detail: {waypoint: waypoints[i], idx: i}
                            }
                        );
                        this.waypointsListener(event);
                    },
                    0
                );
            }
            setTimeout(
                () => {
                    this.props.router.route(this.state.waypoints, this.routeReceived);
                },
                0
            );
        }
    }

    addDraggingWaypoint(afterWpIndex, lngLat) {
        let waypoints = [];
        for (let i = 0; i < this.state.waypoints.length; i++) {
            waypoints[i] = new Waypoint(
                this.state.waypoints[i].lngLat,
                this.state.waypoints[i].name,
                this.state.waypoints[i].options
            );
        }
        let waypoint = new Waypoint(lngLat);
        waypoints.splice(afterWpIndex + 1, 0, waypoint);
        this.setState({waypoints});

        if (this.waypointsListener) {
            for (let i = afterWpIndex + 1; i < waypoints.length; i++) {
                console.log(i);
                setTimeout(
                    () => {
                        const event = new CustomEvent(
                            'waypointsUpdate',
                            {
                                detail: {waypoint: waypoints[i], idx: i}
                            }
                        );
                        this.waypointsListener(event);
                    },
                    0
                );
            }
        }
    }

    render(props, state) {
        return <div class="routing-control">
            <div>
                {state.waypoints.map((waypoint, i) => (
                    <Fragment key={i}>
                        <Marker
                            map={props.map}
                            lngLat={waypoint.lngLat}
                            dragging={state.draggedWaypoint === waypoint}
                            onDrag={(event) => this.dragWaypoint(event, i, true)}
                            onDragEnd={(event) => this.dragWaypoint(event, i)}
                        />
                        { props.geocoder &&
                            <Geocoder
                                waypoint={waypoint}
                                geocoder={props.geocoder}
                                onGeocoded={(event) => this.setWaypoint(i, event.detail)}
                                onReverseGeocoded={(event) => this.setWaypoint(i, event.detail)}
                            />
                        }
                    </Fragment>
                ))}
            </div>
            <div>
                {state.routes.map((route, i) => (
                    <Fragment key={i}>
                        <RouteLine
                            map={props.map}
                            route={route}
                            selected={state.selectedRoute === route}
                            onSelected={() => this.selectRoute(route)}
                            onClick={(event) => this.addDraggingWaypoint(event.detail.afterWpIndex, event.detail.lngLat)}
                        />
                        <Itinerary
                            map={props.map}
                            route={route}
                            selected={state.selectedRoute === route}
                            onSelected={() => this.selectRoute(route)}
                        />
                    </Fragment>
                ))}
            </div>
        </div>;
    }
}
