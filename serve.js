const express = require('express');
const path = require('path');
const staticServeConfig = require('./static.serve.conf.js');

const PORT = 5000;
const app = express();

for (const route of Object.keys(staticServeConfig)) {
  const config = staticServeConfig[route];
  app.get(route, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'origin, content-type, accept');
    res.sendFile(path.resolve(__dirname, config.target));
  });
}

const HOSTS = ['127.0.0.1', '::1'];
let logged = false;

for (const host of HOSTS) {
  app.listen(PORT, host, () => {
    if (logged) return;
    logged = true;
    console.log(`\n==> 🌎  Listening on port ${PORT}`);
    console.log(`\nDev URLs (yarn build:<project>:dev):`);
    console.log(`  Hotel:      http://localhost:${PORT}/static/widgets/hotel-dashboard-widgets-dev.js`);
    console.log(`  Utility:    http://localhost:${PORT}/static/widgets/utility-dashboard-widgets-dev.js`);
    console.log(`\nRelease build URLs (yarn build:<project>):`);
    console.log(`  Hotel:      http://localhost:${PORT}/static/widgets/hotel-dashboard-widgets.js`);
    console.log(`  Utility:    http://localhost:${PORT}/static/widgets/utility-dashboard-widgets.js\n`);
  }).on('error', (err) => {
    if (host === '::1' && err.code === 'EADDRNOTAVAIL') return;
    throw err;
  });
}
