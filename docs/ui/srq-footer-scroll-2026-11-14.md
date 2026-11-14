# SRQ footer scroll correction

The hidden accessible legends in SrqResponseControl used absolute positioning
without a containing block. In actual Chrome the document became 6710px tall
inside an 885px viewport, despite the assessment flex layout. Scrolling the
document moved the footer off screen and exposed blank space.

Added position:relative to the response fieldset. The accessible legend remains
available and is now contained by its response control. No footer CSS workaround,
answer behavior, clinical logic, data or dependencies changed.

Changed source: resources/js/components/Relawan/Assessment/SrqResponseControl.vue.

Verification: TypeScript, build, diff check and 11 mounted assessment UI tests
passed. Native Chrome checked widths 320, 421 and 1440px. After scrolling the
question list to the final question and attempting document scrolling, scrollY
remained zero, document height equaled the 885px viewport, the footer position
was unchanged and the last question remained reachable above it. No uncaught
browser errors occurred. Evidence and screenshots:
C:/Users/daffa/AppData/Local/Temp/rapid-t0-help-Yf4s41/.

Published/browser-observed asset: assets/app-BoUCMf7X.js at localhost:8080.
No data edits, database reset, key migration or dependency change was performed.
PHP tests, physical devices and screen-reader testing were not performed for
this CSS-only correction. Existing build warnings remain unchanged. Stop for
review; suggested next check is the same scroll gesture on the owner's phone
after the normal PWA update.
