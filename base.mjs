import puppeteer from 'puppeteer'

const MAX_THREAD = 3

class Pin { }

let pins = [];
let browser

export default class {
    async init() {
        if (browser) {
            return;
        }

        browser = await puppeteer.launch({
            headless: false,
            timeout: 0
        });
    }

    async initPuppeteerInstance() {
        let nowLength = pins.length;
        let newLength = nowLength + 1;

        if (newLength <= MAX_THREAD) {
            let node = new Pin();
            pins.push(node);

            return browser.newPage().then(el => {  
                node.ins = el;
                node.inUse = true;

                node.ins.setDefaultTimeout(0)
                return node;
            });
        } else {
            let handle;

            return new Promise(resolve => {
                handle = setInterval(_ => {
                    let node = [...pins].filter(el => el.inUse === false).shift();

                    if (node !== undefined) {
                        node.inUse = true;
                        clearInterval(handle);
                        resolve(node);
                    }
                }, 200);
            });
        }
    }

    async close() {
        await browser.close();
    }
}
