/*
 * Copyright © 2023 ThingsBoard, Inc.
 */
const STATIC_SERVE_CONFIG = {
  '/static/widgets/hotel-dashboard-widgets.js': {
    'target': 'dist/hotel-dashboard/system/hotel-dashboard-widgets.js'
  },
  '/static/widgets/hotel-dashboard-widgets.js.map': {
    'target': 'dist/hotel-dashboard/system/hotel-dashboard-widgets.js.map'
  },
  '/static/widgets/utility-dashboard-widgets.js': {
    'target': 'dist/utility-dashboard/system/utility-dashboard-widgets.js'
  },
  '/static/widgets/utility-dashboard-widgets.js.map': {
    'target': 'dist/utility-dashboard/system/utility-dashboard-widgets.js.map'
  },
  '/static/widgets/hotel-dashboard-widgets-dev.js': {
    'target': 'dist/hotel-dashboard-dev/system/hotel-dashboard-widgets-dev.js'
  },
  '/static/widgets/hotel-dashboard-widgets-dev.js.map': {
    'target': 'dist/hotel-dashboard-dev/system/hotel-dashboard-widgets-dev.js.map'
  },
  '/static/widgets/utility-dashboard-widgets-dev.js': {
    'target': 'dist/utility-dashboard-dev/system/utility-dashboard-widgets-dev.js'
  },
  '/static/widgets/utility-dashboard-widgets-dev.js.map': {
    'target': 'dist/utility-dashboard-dev/system/utility-dashboard-widgets-dev.js.map'
  }
}

module.exports = STATIC_SERVE_CONFIG;
