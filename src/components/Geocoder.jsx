import { Component } from 'preact';

export default class Geocoder extends Component {
    constructor(options) {
        super(options);
        this.state = {
            waypoint: options.waypoint,
            suggestions: [],
            showSuggestions: false,
            selectedIndex: -1
        };

        this.reverseGeocode = this.reverseGeocode.bind(this);
        this.keydown = this.keydown.bind(this);
        this.input = this.input.bind(this);

        if (this.state.waypoint && !this.state.waypoint.name) {
            this.reverseGeocode();
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (nextState.waypoint && !nextState.waypoint.name) {
            this.reverseGeocode();
        }

        return true;
    }

    keydown (e) {
        const current = this.state.selectedIndex;
        switch (e.keyCode) {
            case 13:
                if (current >= 0) {
                    this.selectSuggestion(this.state.suggestions[current]);
                } else {
                    this.geocode(e);
                }
                break;
            case 38:
                this.changeSelection(-1);
                break;
            case 40:
                this.changeSelection(1);
                break;
        }
    }

    input (e) {
        this.state.waypoint.name = e.target.value;
    }

    changeSelection(direction) {
        const current = this.state.selectedIndex;
        const cnt = this.state.suggestions.length;
        this.setState({selectedIndex: (current + direction) % cnt});
    }

    geocode (e) {
        const waypoint = this.state.waypoint;
        const inputValue = e.target.value;
        const component = this;

        this.props.geocoder.geocode(inputValue, results => {
            results = results.map(result => ({
                name: result.name,
                lngLat: [result.center.lng, result.center.lat]
            }));

            if (results.length === 1) {
                if (component.props.onGeocoded) {
                    waypoint.name = results[0];
                    const event = new CustomEvent('geocoded', {detail: results[0]});
                    component.props.onGeocoded(event);
                }
            } else {
                component.setState({showSuggestions: true, suggestions: results, selectedIndex: -1, waypoint});
            }
        });
        
        return false;
    }

    reverseGeocode () {
        const waypoint = this.state.waypoint;
        const lngLat = waypoint.lngLat;
        const component = this;

        if (lngLat) {
            this.props.geocoder.reverse(
                {lat: lngLat[1], lng: lngLat[0]},
                5,
                (results) => {
                    component.state.waypoint.name = results[0].name;
                    if (component.props.onReverseGeocoded) {
                        const event = new CustomEvent(
                            'reversegeocoded',
                            {
                                detail: {
                                    name: results[0].name,
                                    lngLat: [results[0].center.lng, results[0].center.lat]
                                }
                            }
                        );
                        component.props.onReverseGeocoded(event);
                    }
                }
            );
        }
    }

    selectSuggestion (suggestion) {
        this.setState({showSuggestions: false, suggestions: [], selectedIndex: -1});
        if (this.props.onGeocoded) {
            const event = new CustomEvent('geocoded', {detail: suggestion});
            this.props.onGeocoded(event);
        }
    }

    render(props, state) {
        return <div class="routing-control-geocoder">
            <input
                value={props.waypoint.name}
                onKeydown={(event) => this.keydown(event)}
                onInput={(event) => this.input(event)} />
                { state.showSuggestions &&
                    <ul>
                        {state.suggestions.map((suggestion, i) => (
                            <li key={i} class={state.selectedIndex === i ? 'selected' : ''}>
                                <button type="button" onMouseDown={() => this.selectSuggestion(suggestion)}>{suggestion.name}</button>
                            </li>
                        ))}
                    </ul>
                }
        </div>;
    }
}
