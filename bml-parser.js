function parseBML(xmlString) {
    let bml = {
        name: '',
        description: '',
        creator: '',
        author: '',
        loop: false,
        duration: 0,
        width: 0,
        height: 0,
        bits: 1,
        channels: 1,
        frames: []
    };

    let xmlDom = (new DOMParser()).parseFromString(xmlString, 'application/xml');
    let blmElement = xmlDom.documentElement;
    bml.width = parseInt(blmElement.getAttribute('width'), 10);
    bml.height = parseInt(blmElement.getAttribute('height'), 10);
    bml.bits = parseInt(blmElement.getAttribute('bits') ?? '1', 10);
    bml.maxval = 2**bml.bits - 1;
    bml.hexdigits_per_column = Math.ceil(bml.bits/4);
    let headerElement = blmElement.querySelector("header");
    for(let headerAttr of ['name', 'title', 'description', 'creator', 'author']) {
        bml[headerAttr] = headerElement?.querySelector(headerAttr)?.textContent ?? '';
    }
    bml.loop = headerElement?.querySelector('loop')?.textContent === 'yes';
    for(let xmlFrame of Array.from(xmlDom.querySelectorAll('frame'))) {
        let frame = new Float32Array(bml.width * bml.height);
        Array.from(xmlFrame.querySelectorAll('row')).forEach((rowElement, rowIndex) => {
            let rowText = rowElement.textContent;
            for(let columnIndex = 0; columnIndex < bml.width; columnIndex++) {
                let valueText = rowText.substring(columnIndex * bml.hexdigits_per_column, (columnIndex + 1) * bml.hexdigits_per_column);
                let valueInt = parseInt(valueText, 16);
                let value = valueInt / bml.maxval;
                frame[rowIndex * bml.width + columnIndex] = value;
            }
        });
        frame.duration = parseInt(xmlFrame.getAttribute('duration'), 10);
        bml.frames.push(frame);
    }
    return bml;
}

function parseBLM(blmString) {
    let blmLines = blmString.split('\n');
    let blm = {
        name: '',
        description: '',
        creator: '',
        author: '',
        loop: false,
        duration: 0,
        width: null,
        height: null,
        bits: 1,
        channels: 1,
        frames: []
    };

    let header_done = false;
    let frame = null;
    let frame_line = 0;

    for(let line of blmLines) {
        if(blm.width === null) {
            let movie_header_search = /# *BlinkenLights Movie *(\d+)x(\d+)$/.exec(line);
            if(movie_header_search) {
                let [, width_string, height_string] = movie_header_search;
                blm.width = parseInt(width_string, 10);
                blm.height = parseInt(height_string, 10);
            }
        }
        if(!header_done) {
            let header_search = /# (name|title|description|creator|author) *= *(.+)$/.exec(line);
            if(header_search) {
                blm[header_search[1]] = header_search[2]
            }
        }
        if(line.startsWith('@')) {
            header_done = true;
            frame = new Float32Array(blm.width * blm.height);
            frame.duration = parseInt(/@(\d+)$/.exec(line)[1], 10);
            frame_line = 0;
            blm.frames.push(frame);
        } else if(frame && /^[01]+$/.test(line)) {
            for(let columnIndex = 0; columnIndex < blm.width; columnIndex++) {
                let valueText = line[columnIndex];
                let value = parseInt(valueText, 16);
                frame[frame_line * blm.width + columnIndex] = value;
            }
            frame_line+=1;
        }
    }
    return blm;
}