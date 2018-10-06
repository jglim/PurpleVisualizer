# Purple Visualizer

![Preview](https://raw.github.com/jglim/PurpleVisualizer/master/preview.gif)

### Setup

![Setup](https://raw.github.com/jglim/PurpleVisualizer/master/setup.gif)

Drag the bigass button in the [setup page](https://ecg.sn.sg/purple/bookmarklet.html) to your bookmarks bar

To use, click the previously added bookmark when reviewing your OSHPark PCB. The URL should resemble something like "https://oshpark.com/uploads/xxxxxx/approval/new"

### How it works

1. The bookmarklet creates an iframe to load the preview page, with links to oshpark-generated previews passed via GET parameters
2. The preview fetches the preview images via a CORS proxy. This is required unless OSHPark adds `access-control-allow-origin` to their images
3. An alpha mask is made from the Edge.Cuts layer
4. The other images are keyed out using the "oshpark purple" #330055
5. Everything is put together in the three.js view

_This isn't official or endorsed by the folks at oshpark.com though I would be glad to see them implement something like this._

### Known Issues

- Controls appear to be broken right now 
- (New!) 4-layer boards don't work 

_Made over the weekends "hackathon-grade" code quality - this WILL be buggy_


[@jg_lim](https://twitter.com/jg_lim)
