import fs from "fs";
import { EtherscanParser, TEtherscanCodeResult } from "./EtherscanParser";

async function main(): Promise<void>
{
    const lParser: EtherscanParser = new EtherscanParser();
    const lResult: TEtherscanCodeResult = await lParser.GetFlattenedSourceCode(
        "0xC6845a5C768BF8D7681249f8927877Efda425baf",
    );

    fs.writeFileSync("./out.sol", lResult.code);
}
main();
