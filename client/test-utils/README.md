This folder contains small test helpers used by the client test suite.

- `previewReady.js` provides `waitForPreviewReady(screen, timeout)` which polls for `data-preview-ready` on document.body and ensures PreviewWindow has updated the DOM.

Usage: import { waitForPreviewReady } from "../test-utils/previewReady" in tests.
