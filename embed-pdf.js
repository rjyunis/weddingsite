const iframe = document.getElementById("pdf");

iframe.addEventListener("load", () => {

    const win = iframe.contentWindow;
	const doc = iframe.contentDocument;

    if (!win?.PDFViewerApplication) return;
	
	win.PDFViewerApplication.initializedPromise.then(async () => {

		const app = win.PDFViewerApplication;

		await app.initializationPromise;

		const viewer = app.pdfViewer;

		viewer.currentScaleValue = "page-width";

		const doc = iframe.contentDocument;

		const resizeIframe = () => {

			const viewerEl = doc.getElementById("viewer");
			if (!viewerEl) return;

			// force layout flush
			const height = viewerEl.getBoundingClientRect().height;
			console.log(height);
			iframe.style.height = viewerEl.scrollHeight - 20 + "px";
		};

		// wait until ALL pages are rendered
		const waitForRender = () => {
			return new Promise(resolve => {
				const check = () => {
					const pages = doc.querySelectorAll(".page");
					const rendered = Array.from(pages).every(p =>
						p.getBoundingClientRect().height > 0
					);
					if (rendered && pages.length === app.pagesCount && pages.length > 0) {
						resolve();
					} else {
						requestAnimationFrame(check);
					}
				};

				check();
			});
		};
		
		await waitForRender();
		resizeIframe();

		// wait until pages are fully rendered
/* 		requestAnimationFrame(() => {
			setTimeout(resizeIframe, 2000);
		}); */
	});

    const app = win.PDFViewerApplication;

    app.initializedPromise.then(async () => {

        const viewer = app.pdfViewer;
        const container = doc.getElementById("viewerContainer");

        // ------------------------------------------------------------
        // 1. Lock zoom (NO event listeners, NO recursion risk)
        // ------------------------------------------------------------
        viewer.currentScaleValue = "page-width";

        // Prevent any programmatic zoom drift (safe re-assert only)
        app.eventBus.on("pagesinit", () => {
            viewer.currentScaleValue = "page-width";
        });

        // ------------------------------------------------------------
        // 2. Disable zoom inputs (user interaction layer)
        // ------------------------------------------------------------
        container.addEventListener("wheel", (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, { passive: false });

        doc.addEventListener("keydown", (e) => {
            if (
                e.ctrlKey &&
                ["+", "-", "=", "0"].includes(e.key)
            ) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        // ------------------------------------------------------------
        // 3. Improve sharpness (retina-safe rendering)
        // ------------------------------------------------------------
        const dpr = window.devicePixelRatio || 1;

        if (dpr > 1) {
            // PDF.js automatically respects DPR in rendering pipeline,
            // but forcing a refresh ensures correct initial rasterization
            viewer.currentScaleValue = "page-width";
            viewer.refresh?.(true);
        }

        // ------------------------------------------------------------
        // 4. Optional UX cleanup
        // ------------------------------------------------------------
        const style = doc.createElement("style");
        style.textContent = `
            /* Hide UI completely */
            #toolbarContainer,
            #secondaryToolbar,
            #sidebarContainer,
            #findbar,
            #editorModeButtons {
                display: none !important;
            }

            /* Remove reserved UI spacing */
            #viewerContainer {
                top: 0 !important;
            }

            /* Center pages like a document */
            #viewer {
                margin: 0 auto !important;
            }

            /* Remove horizontal overflow */
            #viewerContainer {
                overflow-x: hidden !important;
            }
        `;
        doc.head.appendChild(style);
    });
});