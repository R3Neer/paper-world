(function (global) {
    'use strict';

    const instances = new WeakMap();
    const themeProperties = {
        background: '--dc-canvas-background',
        shell: '--dc-shell-background',
        shellBorder: '--dc-shell-border',
        shellDetail: '--dc-shell-detail',
        shellShadow: '--dc-shell-shadow',
        screen: '--dc-screen-background',
        screenInset: '--dc-screen-inset',
        island: '--dc-island',
        zoomSurface: '--dc-zoom-surface',
        zoomText: '--dc-zoom-text',
        zoomButton: '--dc-zoom-button',
        zoomButtonText: '--dc-zoom-button-text',
        zoomBorder: '--dc-zoom-border',
        zoomShadow: '--dc-zoom-shadow',
        zoomRadius: '--dc-zoom-radius',
        zoomButtonRadius: '--dc-zoom-button-radius',
        zoomBorderWidth: '--dc-zoom-border-width',
        zoomShadowX: '--dc-zoom-shadow-x',
        zoomShadowY: '--dc-zoom-shadow-y',
        zoomFont: '--dc-zoom-font'
    };

    function isMobileHandset() {
        const agent = navigator.userAgent;
        const compactTouchScreen = navigator.maxTouchPoints > 0 && Math.min(window.screen.width, window.screen.height) <= 600;
        if (compactTouchScreen) return true;
        if (/iPad/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1)) return false;
        if (/Android/i.test(agent) && !/Mobile/i.test(agent)) return false;
        if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') return navigator.userAgentData.mobile;
        return /iPhone|iPod|Windows Phone|Android.*Mobile|\bMobi\b/i.test(agent);
    }

    function orientationCorrection() {
        if (window.innerWidth <= window.innerHeight) return 0;
        const angle = (window.screen.orientation && window.screen.orientation.angle) ?? window.orientation;
        return angle === 270 || angle === -90 ? -90 : 90;
    }

    function resolveTarget(target) {
        return typeof target === 'string' ? document.querySelector(target) : target;
    }

    function mount(target, options) {
        const app = resolveTarget(target);
        if (!app) throw new Error('DeviceCanvas: target not found.');
        if (instances.has(app)) return instances.get(app);

        const settings = options || {};
        const handset = settings.handset === undefined ? isMobileHandset() : Boolean(settings.handset);
        const placeholder = document.createComment('device-canvas-anchor');
        const root = document.createElement('div');
        root.className = 'device-canvas' + (handset ? ' dc-handset' : '');
        root.innerHTML = `
            <div class="dc-zoom-controls" role="group" aria-label="Device zoom controls">
                <button type="button" data-dc-zoom="out" aria-label="Zoom out">−</button>
                <output aria-label="Zoom level">100%</output>
                <button type="button" data-dc-zoom="in" aria-label="Zoom in">+</button>
            </div>
            <div class="dc-stage">
                <div class="dc-shell">
                    <i class="dc-side-button dc-silent" aria-hidden="true"></i>
                    <i class="dc-side-button dc-volume-up" aria-hidden="true"></i>
                    <i class="dc-side-button dc-volume-down" aria-hidden="true"></i>
                    <i class="dc-side-button dc-power" aria-hidden="true"></i>
                    <div class="dc-screen">
                        <div class="dc-content"></div>
                        <div class="dc-dynamic-island" aria-hidden="true"></div>
                        <div class="dc-home-indicator" aria-hidden="true"></div>
                    </div>
                </div>
            </div>`;

        app.parentNode.insertBefore(placeholder, app);
        placeholder.parentNode.insertBefore(root, placeholder.nextSibling);
        root.querySelector('.dc-content').appendChild(app);
        app.classList.add('dc-app');
        document.body.classList.add('dc-mounted');
        if (handset) document.body.classList.add('dc-handset-mounted');

        const output = root.querySelector('output');
        let zoom = settings.zoom ?? Math.min(1, Math.max(0.55, (window.innerWidth - 28) / 438));

        function setZoom(value) {
            zoom = Math.min(settings.maxZoom ?? 1.35, Math.max(settings.minZoom ?? 0.5, Math.round(Number(value) * 20) / 20));
            root.style.setProperty('--dc-zoom', String(zoom));
            output.value = Math.round(zoom * 100) + '%';
            output.textContent = output.value;
            return zoom;
        }

        function setTheme(theme) {
            Object.entries(theme || {}).forEach(([name, value]) => {
                const property = themeProperties[name] || (name.startsWith('--') ? name : null);
                if (property && value != null) root.style.setProperty(property, String(value));
            });
            if (handset) {
                const screenBackground = getComputedStyle(root).getPropertyValue('--dc-screen-background').trim();
                document.body.style.setProperty('--dc-handset-background', screenBackground);
            }
        }

        function syncOrientation() {
            root.style.setProperty('--dc-handset-rotation', orientationCorrection() + 'deg');
        }

        function changeZoom(event) {
            const direction = event.currentTarget.dataset.dcZoom === 'in' ? 1 : -1;
            setZoom(zoom + direction * (settings.zoomStep ?? 0.1));
        }

        const zoomOut = root.querySelector('[data-dc-zoom="out"]');
        const zoomIn = root.querySelector('[data-dc-zoom="in"]');
        zoomOut.addEventListener('click', changeZoom);
        zoomIn.addEventListener('click', changeZoom);
        window.addEventListener('resize', syncOrientation);
        window.addEventListener('orientationchange', syncOrientation);
        if (window.screen.orientation && window.screen.orientation.addEventListener) window.screen.orientation.addEventListener('change', syncOrientation);

        setTheme(settings.theme);
        setZoom(zoom);
        syncOrientation();

        const api = {
            root,
            app,
            handset,
            setZoom,
            setTheme,
            getZoom: () => zoom,
            destroy() {
                zoomOut.removeEventListener('click', changeZoom);
                zoomIn.removeEventListener('click', changeZoom);
                window.removeEventListener('resize', syncOrientation);
                window.removeEventListener('orientationchange', syncOrientation);
                if (window.screen.orientation && window.screen.orientation.removeEventListener) window.screen.orientation.removeEventListener('change', syncOrientation);
                root.parentNode.insertBefore(app, root);
                app.classList.remove('dc-app');
                root.remove();
                placeholder.remove();
                instances.delete(app);
                if (!document.querySelector('.device-canvas')) {
                    document.body.classList.remove('dc-mounted', 'dc-handset-mounted');
                    document.body.style.removeProperty('--dc-handset-background');
                }
            }
        };

        instances.set(app, api);
        return api;
    }

    global.DeviceCanvas = Object.freeze({ mount, isMobileHandset });
})(window);
