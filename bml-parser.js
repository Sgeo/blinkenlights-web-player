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
    for(let headerAttr of ['name', 'description', 'creator', 'author']) {
        bml[headerAttr] = headerElement.querySelector(headerAttr)?.textContent;
    }
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