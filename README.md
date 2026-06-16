# Revelton IoT Dashboard — ThingsBoard Extension

This repository contains the **Revelton IoT Dashboard**, a specialized ThingsBoard extension designed for high-end hotel and room management. It provides a suite of custom Angular components for monitoring and controlling room environments, including climate control, air quality, and occupancy sensors.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.20.0
- [Yarn](https://classic.yarnpkg.com/) >= 1.22.22 (Yarn Classic)

---

## 1. Development Mode (Local Testing)

During development, you can serve the extension from your local machine to see changes in real-time without uploading files to ThingsBoard.

### Step A: Start the Dev Server
```bash
yarn install
yarn start
```
The server will start on port 5000. The extension bundle is available at:
`http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`

### Step B: Configure ThingsBoard Widget Resources
1. Open your widget in the ThingsBoard **Widgets Library**.
2. Navigate to the **Resources** tab.
3. Add a new resource URL: `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`.
4. **Crucial**: Ensure the **"Is extension"** checkbox is checked for this resource.

---

## 2. Production Mode (Deployment)

When you are ready to deploy your changes to a live ThingsBoard environment.

### Step A: Build the Project
```bash
yarn build
```
The optimized production bundle will be generated at:
`target/generated-resources/thingsboard-extension-widgets.js`

### Step B: Upload to ThingsBoard
1. In the ThingsBoard UI, go to **Resources** > **JavaScript library**.
2. Click the **"+"** button and select **Extension** from the "JavaScript type" dropdown.
3. Upload the compiled `thingsboard-extension-widgets.js` file from your `target/` directory.

### Step C: Update Widget Resources
1. In your widget's **Resources** tab, remove the `localhost` URL.
2. Click **Add**, check **"Is extension"**, and select your uploaded library from the dropdown.

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

**For the Historical Dashboard:**
```html
<revelton-tb-extension-historical-dashboard [ctx]="ctx"></revelton-tb-extension-historical-dashboard>
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
        || self.ctx.$scope.reveltonTbExtensionHistoricalDashboardComponent
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
        || self.ctx.$scope.reveltonTbExtensionHistoricalDashboardComponent
        || self.ctx.$scope.reveltonUtilityDashboardComponent;
    
    if (component && typeof component.onDataUpdated === 'function') {
        component.onDataUpdated();
    }
};
```

---

## Project Structure

- **Hotel Dashboard (`src/app/components/revelton-tb-extension-dashboard/`)**:
  - `features/hotel-dashboard`: Main high-level overview (`<tb-revelton-dashboard>`).
  - `features/room-view`: Individual room status cards (`<tb-room-card>`) and detail panels.
  - `features/other-devices-panel`: Management for auxiliary devices (lights, plugs, etc.).
  - `features/control-panel`: Centralized device control.
  - `shared/components/`: Thermostat controls, environmental sensors (AQI, noise, humidity), and UI elements like activity logs and alerts panels.
- **Historical Dashboard (`src/app/components/revelton-tb-extension-historical-dashboard/`)**:
  - Timeseries data visualization with filterable time ranges.
  - Feature panels: Thermostat, Air Quality, Acoustics, Window, Water Leak, Occupancy.
  - Shared components: Summary cards, filter bar, charts.
- **Utility Dashboard (`src/app/components/revelton-tb-extension-utility-dashboard/`)**:
  - Real-time EV charger monitoring (`<revelton-utility-dashboard>`).
  - Charging status cards with power, energy, and session duration per charger.

## Gateway & Data Mapping
The `gateway-export.json` file is provided for the **ThingsBoard IoT Gateway**. It includes pre-configured MQTT mappings for Zigbee2MQTT devices:
- **TRVs**: Mapping for heating setpoints and system modes.
- **Sensors**: Standardized mapping for temperature, humidity, and contact sensors.

## Technical Notes
- **Tailwind CSS**: Leveraged for styling. Ensure `yarn start` or `yarn build` is used to compile styles.
- **Theme Support**: Integrated with a `ThemeService` to support seamless light/dark mode switching.

## License
Copyright © 2024 Revelton. All rights reserved.