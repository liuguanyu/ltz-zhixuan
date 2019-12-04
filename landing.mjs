import Base from "./base"
import User from "./user"

const LANDING_PAGE = "https://lantouzi.com/user"

let isLogin = false

export default class extends Base { 
    async landing() { 
        if (isLogin) {
            return
        }

        let node = await this.initPuppeteerInstance()
        let page = node.ins
        
        await page.goto(LANDING_PAGE)

        await page.waitForSelector('.tab-title') 
        await page.click(".tab-title-two :nth-child(2)", { delay: 100 })
        await page.type("#name", User.user, { delay: 100 })
        await page.type("#password", User.pass, { delay: 100 })
        await page.click(".btn-login", { delay: 100 })

        await page.waitForSelector('.user-name')

        isLogin = true

        node.inUse = false
    }
}