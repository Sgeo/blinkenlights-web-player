class Theme {
    constructor() {

    }
    static async retrieve(url, canvas) {
        let theme = new Theme();
        let xmlText = await fetch(url).then(resp => resp.text());
        let xml = (new DOMParser()).parseFromString(xmlText, 'application/xml');
        theme._xml = xml;
        theme._canvas = canvas;
        theme._context = canvas.getContext('2d');
        theme._base = new URL(url, window.location.href);
        theme.rows = parseInt(xml.documentElement.getAttribute('rows'), 10);
        theme.columns = parseInt(xml.documentElement.getAttribute('columns'), 10);
        theme.width = parseInt(xml.documentElement.getAttribute('width'), 10);
        theme.height = parseInt(xml.documentElement.getAttribute('height'), 10);
        theme.channels = parseInt(xml.documentElement.getAttribute('channels') ?? '1', 10);
        theme.maxval = parseInt(xml.documentElement.getAttribute('maxval') ?? '1', 10);
        let background_node = xml.documentElement.querySelector("background");
        if(background_node) {
            let background_url = background_node.getAttribute('image');
            canvas.style.backgroundImage = `url(${new URL(background_url, theme._base)})`;
        }
        let overlay_node = theme._xml.querySelector('overlay');
        let overlay_url = overlay_node.getAttribute('image');
        theme._image = new Image();
        theme._image.src = new URL(overlay_url, theme._base);
        let image_promise = new Promise((resolve, reject) => {
            theme._image.addEventListener('load', function() {
                resolve();
            }, false);
        });
        canvas.style.width = `${theme.width}px`;
        canvas.style.height = `${theme.height}px`;
        canvas.width = theme.width;
        canvas.height = theme.height;

        let windows = [];
        for(let child of Array.from(overlay_node.children)) {
            if(/grid|span/i.test(child.tagName)) {
                windows.push(...Theme._unroll_span_grid(theme, child));
            } else {
                windows.push(Theme._parse_window_element(child));
            }
        }
        theme.windows = [];
        for(let row = 0; row < theme.rows; row++) {
            theme.windows[row] = [];
            for(let column = 0; column < theme.columns; column++) {
                theme.windows[row][column] = [];
                for(let value = 0; value <= theme.maxval; value++) {
                    let relevant_windows = windows.filter(w => w.row === row && w.column === column && (w.value === value || w.value === null));
                    if(relevant_windows.length !== 1) {
                        console.error(`Weird windows, row ${row} column ${column} value ${value}`);
                    }
                    if(relevant_windows.length > 0) {
                        theme.windows[row][column][value] = relevant_windows[0];
                    }
                }
            }
        }
        await image_promise;
        return theme;
    }

    draw(row, col, value) {
        if(value === 0) {
            console.error("Not implemented yet");
        } else {
            let w = this.windows[row][col][value];
            this._context.drawImage(this._image, w.src_x, w.src_y, w.width, w.height, w.x, w.y, w.width, w.height);
        }
    }

    clear() {
        this._context.clearRect(0, 0, this.width, this.height);
    }

    static _unroll_span_grid(theme, element) {
        let original_windows;
        let new_windows = [];
        let dx = parseInt(element.getAttribute('dx') ?? '0', 10);
        let dy = parseInt(element.getAttribute('dy') ?? '0', 10);
        let sx = parseInt(element.getAttribute('sx') ?? '0', 10);
        let sy = parseInt(element.getAttribute('sy') ?? '0', 10);
        original_windows = Array.from(element.querySelectorAll('window')).map(windowElement => Theme._parse_window_element(windowElement));
        for(let original_window of original_windows) {
            for(let row = 0; row < theme.rows; row++) {
                for(let column = 0; column < theme.columns; column++) {
                    let new_window = Object.assign({}, original_window);
                    if(/grid/i.test(element.tagName)) new_window.row = row;
                    new_window.column = column;
                    new_window.src_x += column * sx;
                    new_window.x += column * dx;
                    if(/grid/i.test(element.tagName)) {
                        new_window.src_y += row * sy;
                        new_window.y += row * dy;
                    }
                    new_windows.push(new_window);
                }
                if(/span/i.test(element.tagName)) {
                    break;
                }
            }
        }
        return new_windows;
    }

    static _parse_window_element(windowElement) {
        let b_window = {};
        let valueattr = windowElement.getAttribute('value') ?? 'all';
        b_window.value = valueattr === 'all' ? null : parseInt(valueattr, 10);
        b_window.row = parseInt(windowElement.getAttribute('row') ?? '0', 10);
        b_window.column = parseInt(windowElement.getAttribute('column') ?? '0', 10);
        b_window.x = parseInt(windowElement.getAttribute('x') ?? '0', 10);
        b_window.y = parseInt(windowElement.getAttribute('y') ?? '0', 10);
        b_window.width = parseInt(windowElement.getAttribute('width') ?? '0', 10);
        b_window.height = parseInt(windowElement.getAttribute('height') ?? '0', 10);
        b_window.src_x = parseInt(windowElement.getAttribute('src-x') ?? '0', 10);
        b_window.src_y = parseInt(windowElement.getAttribute('src-y') ?? '0', 10);
        return b_window;
    }
}