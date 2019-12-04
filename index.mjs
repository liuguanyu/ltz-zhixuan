import LandingPage from "./landing"
import BillsPage from "./bills"

(async _ => {
    let lp = new LandingPage()
    await lp.init()
    await lp.landing()

    let bill = new BillsPage()
    await bill.init()
    await bill.getBills()
})()