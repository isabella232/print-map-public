import React, { Component, Fragment } from "react";
import "./App.css";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import debounce from "debounce";
import produce from "immer";
import { printMap } from "./printMap";
import {
  Button,
  createMuiTheme,
  ExpansionPanelDetails,
  ExpansionPanel,
  ExpansionPanelSummary,
  Grid,
  Input,
  ListItemText,
  MuiThemeProvider,
  MenuList,
  MenuItem,
  Paper,
  TextField,
  Typography,
  FormGroup
} from "@material-ui/core";
import ExpandMore from "@material-ui/icons/ExpandMore";
import {
  POI_LAYER,
  POI_SOURCE,
  CHOSEN_LAYER,
  CHOSEN_SOURCE,
  SOURCE,
  PIN_LAYER,

} from "./constants";

const Icon = {
  STROKE: 0,
  FILL: 1
};

const theme = createMuiTheme({
  typography: {
    useNextVariants: true
  }
});

const params = new URLSearchParams(window.location.search);
const config = window.print_config;
mapboxgl.accessToken = params.get("access_token") || config.access_token;

class App extends Component {
  constructor(props) {
    super(props);
    this.mapContainer = React.createRef();
    this.map = null;
    this.customPoiCounter = 0;

    this.state = {
      nearbyPois: {},
      chosenPois: {},
      customPoiName: "",
      allLocations: [],
      filteredLocations: [],
      visibleLocations: {},
      printDimensions: [2550, 3400],
      poiFontSize: config.default_label_font_size,
      locationFontSize: config.default_location_label_font_size,
      iconScale: 1,
      filterText: "",
      saving: false,
      clickLocation: ""
    };

  }

  componentDidMount() {
    this.initializeMap();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.printDimensions !== prevState.printDimensions) {
      this.map.resize();
    }
    // update map when state changes
    if (this.state.visibleLocations !== prevState.visibleLocations) {
      const locations = this.state.visibleLocations;
      const locationArray = Object.keys(locations).map(key => locations[key]);
      if (locationArray.length === 1) {
        const first = locationArray[0];
        this.map.easeTo({
          center: [first.longitude, first.latitude],
          zoom: 16,
          duration: 750
        });
      }

      const features = locationArray.map(loc => {
        return {
          type: "Feature",
          id: loc.id,
          geometry: {
            type: "Point",
            coordinates: [loc.longitude, loc.latitude]
          },
          properties: {
            name: loc.name
          }
        };
      });

      // this.map.getSource(SOURCE).setData({
      //   type: "FeatureCollection",
      //   features: features
      // });
    }

    if (this.state.poiFontSize !== prevState.poiFontSize) {
      const value = +this.state.poiFontSize;
      this.map.setLayoutProperty(POI_LAYER, "text-size", value * this.scale());
      this.map.setLayoutProperty(CHOSEN_LAYER, "text-size", value * this.scale());
    }

    // if (this.state.locationFontSize !== prevState.locationFontSize) {
    //   const value = +this.state.locationFontSize;
    //   this.map.setLayoutProperty(PIN_LAYER, "text-size", value * this.scale());
    // }

    // if (this.state.iconScale !== prevState.iconScale) {
    //   const value = +this.state.iconScale;
    //   this.map.setLayoutProperty(CHOSEN_LAYER, "icon-size", value * this.scale());
    //   this.map.setLayoutProperty(PIN_LAYER, "icon-size", value * this.scale());
    // }

    if (this.state.chosenPois !== prevState.chosenPois) {
      this.map.getSource(CHOSEN_SOURCE).setData(this.poisToFeatureCollection(this.state.chosenPois));
    }

    if (this.state.nearbyPois !== prevState.nearbyPois) {
      this.map.getSource(POI_SOURCE).setData(this.poisToFeatureCollection(this.state.nearbyPois));
    }

    if (this.state.clickLocation !== prevState.clickLocation) {
      this.marker.setLngLat(this.state.clickLocation);
    }

    if (this.state.customPoiName !== prevState.customPoiName) {
      this.marker.element.textContent = this.state.customPoiName;
    }
  }

  render() {
    const {
      nearbyPois,
      chosenPois,
      customPoiName,
      poiFontSize,
      locationFontSize,
      iconScale,
      filterText,
      filteredLocations,
      visibleLocations,
      printDimensions,
      saving,
      clickLocation,
      mapReady
    } = this.state;

    const scale = 800 / 3400;
    const previewDimensions = [printDimensions[0] * scale, printDimensions[1] * scale];

    return (
      <MuiThemeProvider theme={theme}>
        <div className="app">
          <Grid container spacing={8} style={{ marginLeft: "auto", marginRight: "auto" }}>
            <Grid item xs={3}>
              <Paper style={{ marginBottom: "1em" }}>
                <FormGroup>
                  <TextField
                    className="text-input"
                    label="POI Font Size (px)"
                    value={poiFontSize}
                    onChange={e => this.setPOIFontSize(e.target.value)}
                  />
                  <TextField
                    className="text-input"
                    label="Location Font Size (px)"
                    value={locationFontSize}
                    onChange={e => this.setLocationFontSize(e.target.value)}
                  />
                  <TextField label="Icon Scale" value={iconScale} onChange={e => this.setIconScale(e.target.value)} />
                  {saving ? (
                    <p>Saving</p>
                  ) : (
                    <Fragment>
                      <Button
                        onClick={() => {
                          this.toggleOrientation();
                        }}
                      >
                        Toggle Orientation
                      </Button>
                      <Button onClick={() => this.generatePrintMap()}>Save Print Map</Button>
                    </Fragment>
                  )}
                </FormGroup>
              </Paper>
              <ExpansionPanel>
                <ExpansionPanelSummary expandIcon={<ExpandMore />}>Add custom POI</ExpansionPanelSummary>
                <ExpansionPanelDetails>
                  <MenuList>
                    <TextField
                      label="Name"
                      value={customPoiName}
                      onChange={e => this.setState({ customPoiName: e.target.value })}
                    />
                    <Typography style={{ minHeight: "1em", marginBottom: "1em" }}>
                      {clickLocation
                        ? `${clickLocation.lng.toFixed(3)}, ${clickLocation.lat.toFixed(3)}`
                        : "click on map to set location"}
                    </Typography>
                    <Button onClick={this.addCustomPoi} id="add-poi-button" variant="outlined">
                      Add POI
                    </Button>
                  </MenuList>
                </ExpansionPanelDetails>
              </ExpansionPanel>
              <Paper>
                <h2>What's Nearby</h2>
                <MenuList style={{ overflow: "scroll", maxHeight: "350px" }}>
                  {Object.keys(chosenPois).map(id => {
                    return (
                      <MenuItem key={id} onClick={() => this.removePoi(id)} selected>
                        {chosenPois[id].name}
                      </MenuItem>
                    );
                  })}
                  {Object.keys(nearbyPois).map(id => {
                    return (
                      <MenuItem key={id} onClick={() => this.addPoi(id)}>
                        {nearbyPois[id].name}
                      </MenuItem>
                    );
                  })}
                </MenuList>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <div
                style={{ width: `${previewDimensions[0]}px`, height: `${previewDimensions[1]}px` }}
                className="mapContainer"
                ref={this.mapContainer}
              />
            </Grid>
          </Grid>
        </div>
      </MuiThemeProvider>
    );
  }

  toggleOrientation() {
    const printDimensions = [this.state.printDimensions[1], this.state.printDimensions[0]];
    this.setState({
      printDimensions
    });
  }

  initializeMap() {
    const zoom = 1;
    const lon = -87.629;
    const lat = 41.88863949900229;

    this.map = new mapboxgl.Map({
      container: this.mapContainer.current,
      style: config.style_url,
      center: [lon, lat],
      zoom: zoom,
      trackResize: false
    });

  }

  async generatePrintMap() {
    const { poiFontSize: fontSize, iconScale, visibleLocations } = this.state;
    let sep = "";
    const filename =
      Object.keys(visibleLocations).reduce((slug, key) => {
        slug += sep + visibleLocations[key].name.split(" ").join("-");
        sep = "-";
        return slug;
      }, "") || "map";
    this.setState({ saving: true });
    await printMap({
      map: this.map,
      dimensions: this.state.printDimensions,
      fontSize,
      iconScale,
      filename
    });
    this.setState({ saving: false });
  }

  // setPOIFontSize(value) {
  //   this.setState({ poiFontSize: value });
  // }

  setLocationFontSize(value) {
    this.setState({ locationFontSize: value });
  }

  setIconScale(value) {
    this.setState({ iconScale: value });
  }


  scale() {
    return this.map.getContainer().clientWidth / this.state.printDimensions[0];
  }
}

export default App;
