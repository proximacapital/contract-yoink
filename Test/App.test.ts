import test from "ava";
import { Class } from "Src/Class";

test("Example Test", (t: any) =>
{
    const lClass: Class = new Class();
    lClass.LogHelloWorld();

    t.pass();
});
