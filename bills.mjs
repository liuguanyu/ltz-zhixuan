import Base from "./base"
import User from "./user"

import fs from "fs"
import path from "path"

const BILL_PAGE = "https://lantouzi.com/user/smartbid/order/datalist"
const BILL_PAGE_NO = "https://lantouzi.com/user/smartbid/order/datalist?page=%%PAGE%%&size=10"

let baseDir = ""

let date = new Date()
let [year, month, day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(function (el) {
    return el < 10 ? "0" + el : el;
});

for (let item of [User.user, year, month, day]) {
    baseDir = baseDir + item + "/"

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir)
    }
} 

const getMaxPages = async (page) => { 
    await page.waitForSelector(".PagerView")
	await page.waitFor(400)
	let maxPage = await page.evaluate(_ => {
        return Number([...document.querySelectorAll(".PagerView a")].pop().getAttribute("href").replace(/javascript:\/\//, ""))
    })

    return maxPage
}   

const getNodes = async (page) => { 
    let nodes = await page.$$('.uc-page .uc-prj-item')

    let infos = await Promise.all(
        nodes.map(async el => {
            let btn = await el.$(".actionBtn")
            btn = btn.asElement()
            let href = await btn.getProperty('href')
            let ret = await href.jsonValue()

            let status = await el.$eval('.status', e => e.innerHTML.trim())
            return {
                status,
                url: ret
            }
        })
    )

    infos = infos.filter(el => el.status !== "已退出")
    return infos
}

// const getResourceContent = async (page, url) => {
//     console.log(page.mainFrame()._id, 57)
//     const { content, base64Encoded } = await page._client.send(
//         'Page.getResourceContent',
//         { frameId: String(page.mainFrame()._id), url }
//     )
//     // assert.equal(base64Encoded, true);
//     return content
// };

export default class extends Base {
    async getList(pn) {
        let list = []

        let _getList = async (p) => { 
            let node = await this.initPuppeteerInstance()
            let page = node.ins

            await page.goto(BILL_PAGE_NO.replace(/%%PAGE%%/, p))
            let tmp = await getNodes(page)
            list = list.concat(tmp);
            node.inUse = false
        }

        let pros = []
    
        for (let i = 1; i <= pn; ++i) { 
            pros.push(_getList(i))
        }

        return Promise.all(pros).then(_ => list)
    }

    async getRightsAndLicenses(list) { 
        let _getInfo = async (item, idx) => { 
            let node = await this.initPuppeteerInstance()
            let page = node.ins 
            let snapDir = item.snapDir

            await page.goto(item["url"])
            await page.waitForSelector(".ltz-text")
            
            await page.screenshot({
                path: snapDir + 'prj-' + idx + '.png',
                fullPage: true
            })    
            node.inUse = false
        }

        let _getPics = async (item, idxp, idx, snapDir) => { 
            let node = await this.initPuppeteerInstance()
            let page = node.ins

            if (page.isExposed === undefined) {
                page.exposeFunction("writeABString", async (strbuf, targetFile) => {
                    return new Promise((resolve, reject) => {
                        // Convert the ArrayBuffer string back to an ArrayBufffer, which in turn is converted to a Buffer
                        const buf = strToBuffer(strbuf);
                    
                        // Try saving the file
                        fs.writeFile(targetFile, buf, (err, text) => {
                            if (err) reject(err);
                            else resolve(targetFile);
                        });
                    });

                    function strToBuffer(str) { // Convert a UTF-8 String to an ArrayBuffer
                        let buf = new ArrayBuffer(str.length); // 1 byte for each char
                        let bufView = new Uint8Array(buf);

                        for (var i = 0, strLen = str.length; i < strLen; i++) {
                            bufView[i] = str.charCodeAt(i);
                        }
                        return Buffer.from(buf);
                    }
                })
                page.isExposed = true
            }

            // await page.goto(BILL_PAGE)

            await page.evaluate((url, targetFile) => {
                function arrayBufferToString(buffer){ // Convert an ArrayBuffer to an UTF-8 String
                    let bufView = new Uint8Array(buffer);
                    let length = bufView.length;
                    let result = '';
                    let addition = Math.pow(2,8)-1;

                    for(let i = 0;i<length;i+=addition){
                        if(i + addition > length){
                            addition = length - i;
                        }
                        result += String.fromCharCode.apply(null, bufView.subarray(i,i+addition));
                    }
                    return result;
                }

                return fetch(url, {
                    method: "GET",
                    credentials: "include"
                }).then(r => r.arrayBuffer())
                .then(ab => {
                    var bufstring = arrayBufferToString(ab);
                    return window.writeABString(bufstring, targetFile)
                })
            }, item.href, snapDir + 'license-' + idxp + '-' + idx + '.pdf')
            node.inUse = false
        }
    
        let pros = []

        for (let i = 0; i < list.length; ++i) {
            pros.push(_getInfo(list[i], i))

            let pics = list[i]["pics"]
            for (let j = 0; j < pics.length; ++j) { 
                pros.push(_getPics(pics[j], i, j, list[i]["snapDir"]))
            }
        }

        return Promise.all(pros)
    }
    
    async desc(list) {
        let _getInfo = async (item) => { 
            let node = await this.initPuppeteerInstance()
            let page = node.ins 

            await page.goto(item.url)

            let title = await page.$eval(".a-title", el => el.innerHTML.trim())
            let order = await page.$eval(".order-info :first-child", el => el.innerText.replace(/订单号：/, "").trim())
            
            let snapDir = baseDir + title + "-" + order + "/"
            if (!fs.existsSync(snapDir)) {
                fs.mkdirSync(snapDir)
            }

            await page.waitForSelector("#buy_prj_relation_list>tr")

            await page.screenshot({
                path: snapDir + 'order.png',
                fullPage: true
            })

            let licenses = await page.$$("#buy_prj_relation_list>tr")

            let infos = await Promise.all(
                licenses.map(async (el, i) => {
                    let rights = await el.$(".obj-detail")
                    rights = rights.asElement()
                    let href = await rights.getProperty('href')
                    let ret = await href.jsonValue()

                    let licensePics = await el.$$('.details-hover a')
                    let pics = await Promise.all(
                        licensePics.map(async (el2, j) => {
                            el2 = el2.asElement()
                            let href = await el2.getProperty('href')
                            let ret2 = await href.jsonValue()

                            return {
                                idx: j,
                                idxp: i,
                                href: ret2.replace(/&type=p$/, "")
                            }
                        })
                    )

                    pics = pics.reduce((prev, curr) => {
                        return prev.concat(curr)
                    }, [])

                    return {
                        pics,
                        url: ret,
                        idx: i,
                        snapDir
                    }
                })
            )

            node.inUse = false
            return infos
        }

        let pros = []

        for (let i = 0; i < list.length; ++i) {
            pros.push(_getInfo(list[i]))
        }

        return Promise.all(pros).then(data => { 
            return data.reduce((prev, curr) => { 
                return prev.concat(curr)
            }, []) 
        })
    }

    async getBills() {
        let node = await this.initPuppeteerInstance()
        let page = node.ins
        await page.goto(BILL_PAGE)

        let maxPage = await getMaxPages(page)
        node.inUse = false
        
        let list = await this.getList(maxPage)
        let infos = await this.desc(list)
        await this.getRightsAndLicenses(infos)
        await this.close()
    }
}