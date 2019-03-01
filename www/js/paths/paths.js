import {Test as TestGeo}  from "./geo/test.js";
import {Test as TestRobot} from "./robot/test.js";

export default function runTests()
{
    let tg = new TestGeo();
    tg.runAll();

    let tr = new TestRobot();
    tr.runAll();
}
