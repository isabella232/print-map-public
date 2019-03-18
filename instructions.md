# Print Screen

## Installation

This application loads relative assets via `fetch`, so it needs to be accessed through a server. Once it is served, you can use the web interface to find and focus on a location, highlight multiple locations, highlight points of interest, and add custom points of interest to the map.

After you have framed the map on a view of interest, you can generate a print-resolution map. The output image is 8.5" x 11" at 300dpi. Note that what you see in the browser is a preview of what you will be generating at print resolution and will not exactly match the final output. You will want to adjust your base map style accordingly.


Then visit `localhost:8000` in your browser.

## Style Configuration

The look of the map is controled by a few variables: the style defined in Mapbox Studio, the icons stored in the `assets/` directory, and the configuration options set in the `assets/configuration.js` file.

### Map Icons

The icons for highlighting points of interest and locations live in the `assets/` directory. Make sure they are print resolution to ensure they look good in your final output (300 pixels multiplied by your target print size in inches). To update them, simply replace those files and refresh the page; this may require a hard refresh to clear the cache.


## Print Map Creation

1. Choose a location (or many locations) from the left column.
2. Add points of interest around the locations as desired.
3. Choose an orientation for the map.
4. Press `save print map` and find the map from your Downloads folder.
