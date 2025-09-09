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
        }, timeout);
        this.setState({routeDebounce});
    }

    selectRoute(route) {
        this.setState({selectedRoute: route});
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
            setTimeout(
                () => {
                    this.props.router.route(this.state.waypoints, this.routeReceived);
                },
                250
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
                            ondrag={(event) => this.dragWaypoint(event, i, true)}
                            ondragend={(event) => this.dragWaypoint(event, i)}
                        />
                        { props.geocoder &&
                            <Geocoder
                                waypoint={waypoint}
                                geocoder={props.geocoder}
                                ongeocoded={(event) => this.setWaypoint(i, event.detail)}
                                onreversegeocoded={(event) => this.setWaypoint(i, event.detail)}
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
                            onselected={() => this.selectRoute(route)}
                            onclick={(event) => this.addDraggingWaypoint(event.detail.afterWpIndex, event.detail.lngLat)}
                        />
                        <Itinerary
                            route={route}
                            selected={state.selectedRoute === route}
                            onselected={() => this.selectRoute(route)}
                        />
                    </Fragment>
                ))}
            </div>
        </div>;
    }
}