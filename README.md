# Revelton IoT Dashboard — ThingsBoard Extension

This repository contains the **Revelton IoT Dashboard**, a specialized ThingsBoard extension designed for high-end hotel and room management. It provides a suite of custom Angular components for monitoring and controlling room environments, including climate control, air quality, and occupancy sensors.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.20.0
- [Yarn](https://classic.yarnpkg.com/) >= 1.22.22 (Yarn Classic)

---

## 1. Development Mode (Local Testing)

Dev bundles have their own file name (`*-dev.js`) and never touch `target/`, so they cannot be mixed up with a release.

### Step A: Build and Serve
```bash
yarn install
yarn build:hotel:dev   # or build:utility:dev
yarn serve
```
The server starts on port 5000. Dev bundle URLs:
- `http://localhost:5000/static/widgets/hotel-dashboard-widgets-dev.js`
- `http://localhost:5000/static/widgets/utility-dashboard-widgets-dev.js`

### Step B: Configure a Dedicated Dev Widget
1. Create a separate widget type for development (not the one production dashboards use).
2. In its **Resources** tab add the `-dev.js` URL and check **"Is extension"**.
3. Never list both the dev URL and the uploaded release library in one widget: selectors are identical in both builds.
4. Unassign the dev dashboard from edge devices; `localhost` only works on your own machine.

---

## 2. Release (Deployment)

### Step A: Build the Project
```bash
yarn build:hotel   # or build:utility, build:all
```
The bundle is written to `target/generated-resources/<bundle>-<version>.js`, for example `hotel-dashboard-widgets-1.0.0.js`. The version is read from `src/<project>/package.json`: bump it before each release. A different build for an already-built version is refused (`--force` overrides).

### Step B: Upload to ThingsBoard
1. In the ThingsBoard UI, go to **Resources** > **JavaScript library**.
2. Click the **"+"** button and select **Extension** from the "JavaScript type" dropdown.
3. Upload the versioned file as a **new** resource. Do not replace the previous one.

### Step C: Switch the Widget
1. In the widget's **Resources** tab, select the new resource (check **"Is extension"**).
2. If something breaks, switch the widget back to the previous version.
3. Delete old versions once one or two newer releases have been stable.

---

## 3. Widget Integration (HTML & JS)

To bridge the ThingsBoard widget environment with your Angular components, use the following code snippets in the widget editor.

### HTML Tab
Insert the component tag. Use the appropriate selector for your widget:

**For the Hotel Dashboard:**
```html
<tb-revelton-dashboard [ctx]="ctx"></tb-revelton-dashboard>
```

**For the Room Card:**
```html
<tb-room-card [ctx]="ctx"></tb-room-card>
```

**For the Utility Dashboard (EV Chargers):**
```html
<revelton-utility-dashboard [ctx]="ctx"></revelton-utility-dashboard>
```

### JavaScript Tab
This code ensures that settings updates and new telemetry data are correctly pushed into the Angular component:

```javascript
self.onInit = function() {
    // Force the Angular component to pick up new settings
    // Supports all dashboard types
    const component = self.ctx.$scope.reveltonHotelComponent
        || self.ctx.$scope.roomCardComponent
        || self.ctx.$scope.reveltonUtilityDashboardComponent;
    
    if (component) {
        if (typeof component.updateSettings === 'function') {
            component.updateSettings();
        }
    }
    self.ctx.detectChanges();
};

self.onDataUpdated = function() {
    // Notify the component when telemetry or attribute data changes
    const component = self.ctx.$scope.reveltonHotelComponent
        || self.ctx.$scope.roomCardComponent
        || self.ctx.$scope.reveltonUtilityDashboardComponent;
    
    if (component && typeof component.onDataUpdated === 'function') {
        component.onDataUpdated();
    }
};
```

---

## Project Structure

- **Hotel Dashboard (`src/hotel-dashboard/`)**:
  - `features/hotel-dashboard`: Main high-level overview (`<tb-revelton-dashboard>`).
  - `features/room-view`: Individual room status cards (`<tb-room-card>`) and detail panels.
  - `features/other-devices-panel`: Management for auxiliary devices (lights, plugs, etc.).
  - `features/control-panel`: Centralized device control.
  - `shared/components/`: Thermostat controls, environmental sensors (AQI, noise, humidity), and UI elements like activity logs and alerts panels.
- **Utility Dashboard (`src/utility-dashboard/`)**:
  - Real-time EV charger monitoring (`<revelton-utility-dashboard>`).
  - Charging status cards with power, energy, and session duration per charger.

## Gateway & Data Mapping
The `gateway-export.json` file is provided for the **ThingsBoard IoT Gateway**. It includes pre-configured MQTT mappings for Zigbee2MQTT devices:
- **TRVs**: Mapping for heating setpoints and system modes.
- **Sensors**: Standardized mapping for temperature, humidity, and contact sensors.

## Technical Notes
- **Styling**: component SCSS only; no global stylesheet is injected into the ThingsBoard page. Build with `yarn build:<hotel|historical|utility>`.
- **Theme Support**: Integrated with a `ThemeService` to support seamless light/dark mode switching.

## License
Copyright © 2024 Revelton. All rights reserved.